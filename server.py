#!/usr/bin/env python3
"""Server voor de roadmap: levert de site en een kleine API voor opmerkingen.

Draait op ZAD met Keycloak (SSO Rijk). De server doet het inloggen zelf (OIDC authorization code
flow met PKCE), zodat een paar pagina's openbaar kunnen zijn (PUBLIC_PAGES) en de rest achter de
inlog blijft. Opmerkingen lezen en plaatsen kan alleen ingelogd. Opmerkingen en sessies staan in
SQLite op een persistent volume.

Alleen de standaardbibliotheek, zodat de container klein en zonder afhankelijkheden blijft.

Omgevingsvariabelen:
  PORT       poort (standaard 8080)
  SITE_DIR   map met de site (standaard: dist)
  DATA_DIR   map voor de database (standaard: /data; moet schrijfbaar zijn)
  EDITORS    komma-gescheiden e-mailadressen die opmerkingen mogen oplossen; leeg = iedereen
  DEV_USER   alleen lokaal: e-mailadres om als ingelogde gebruiker te testen zonder Keycloak
  AUTH       'app' = zelf inloggen via Keycloak; leeg = achter de authorization-wall (headers)
  PUBLIC_PAGES  komma-gescheiden pagina's die zonder inloggen te zien zijn (standaard: ebw-landschap.html)
  BASE_URL   adres van de site voor de redirect na het inloggen (standaard: https://<Host-header>)
  OIDC_DISCOVERY_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET  van de ZAD-service keycloak

Lokaal: SITE_DIR=. DATA_DIR=.data DEV_USER=voornaam.achternaam@rijksoverheid.nl python3 server.py
"""
import base64
import datetime
import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import urllib.parse
import urllib.request
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('PORT', '8080'))
SITE_DIR = os.environ.get('SITE_DIR', 'dist')
DATA_DIR = os.environ.get('DATA_DIR', '/data')
EDITORS = {e.strip().lower() for e in os.environ.get('EDITORS', '').split(',') if e.strip()}
DEV_USER = os.environ.get('DEV_USER', '')
PUBLIC_PAGES = {p.strip() for p in os.environ.get('PUBLIC_PAGES', 'ebw-landschap.html').split(',') if p.strip()}
BASE_URL = os.environ.get('BASE_URL', '').rstrip('/')
OIDC_DISCOVERY_URL = os.environ.get('OIDC_DISCOVERY_URL', '')
OIDC_CLIENT_ID = os.environ.get('OIDC_CLIENT_ID', '')
OIDC_CLIENT_SECRET = os.environ.get('OIDC_CLIENT_SECRET', '')
# AUTH=app: de server doet het inloggen zelf (openbare pagina's mogelijk). Anders: achter de authorization-wall,
# die de identiteit in headers meegeeft. Die headers worden in app-modus nooit vertrouwd.
LOGIN = os.environ.get('AUTH') == 'app' and bool(OIDC_DISCOVERY_URL and OIDC_CLIENT_ID)
WALL = os.environ.get('AUTH') != 'app'
COOKIE = 'roadmap_sessie'
SESSION_SECONDS = 12 * 3600
MAX_BODY = 20_000
LIMITS = {'anker': 600, 'onderdeel': 600, 'opmerking': 5000, 'tekst': 5000, 'conclusie': 5000}

DB_LOCK = threading.Lock()


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')


def connect() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(os.path.join(DATA_DIR, 'opmerkingen.db'), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS opmerkingen (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          anker TEXT NOT NULL, onderdeel TEXT NOT NULL, opmerking TEXT NOT NULL,
          auteur TEXT NOT NULL, email TEXT NOT NULL, datum TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          conclusie TEXT NOT NULL DEFAULT '', opgelost_door TEXT NOT NULL DEFAULT '', opgelost_op TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS sessies (
          token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, naam TEXT NOT NULL, verloopt REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reacties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opmerking_id INTEGER NOT NULL REFERENCES opmerkingen(id),
          auteur TEXT NOT NULL, email TEXT NOT NULL, datum TEXT NOT NULL, tekst TEXT NOT NULL
        );
    """)
    return conn


try:
    DB = connect()
except (sqlite3.Error, OSError) as err:  # bijvoorbeeld geen schrijfbaar volume
    print(f'Database niet beschikbaar ({err}); opmerkingen staan uit')
    DB = None


def display_name(email: str, username: str) -> str:
    """'voornaam.achternaam@…' wordt 'Voornaam Achternaam'; anders de gebruikersnaam."""
    local = (email or username or '').split('@')[0]
    parts = [p for p in re.split(r'[._-]+', local) if p]
    return ' '.join(p[:1].upper() + p[1:] for p in parts) or 'Onbekend'


# ---- inloggen via Keycloak (OIDC)
_discovery = {}
PENDING = {}  # state -> (code_verifier, terug-pad, tijdstip); kort geldig, alleen in het geheugen
MEMORY_SESSIONS = {}  # als er geen database is


def discovery() -> dict:
    if not _discovery:
        with urllib.request.urlopen(OIDC_DISCOVERY_URL, timeout=10) as res:
            _discovery.update(json.load(res))
    return _discovery


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def safe_path(rd: str) -> str:
    """Alleen een pad op deze site als bestemming na het inloggen (geen open redirect)."""
    return rd if rd.startswith('/') and not rd.startswith('//') and '\\' not in rd else '/'


def new_session(email: str, naam: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = time.time() + SESSION_SECONDS
    if DB is None:
        MEMORY_SESSIONS[token_hash(token)] = (email, naam, expires)
    else:
        with DB_LOCK:
            DB.execute('DELETE FROM sessies WHERE verloopt < ?', (time.time(),))
            DB.execute('INSERT INTO sessies VALUES (?,?,?,?)', (token_hash(token), email, naam, expires))
            DB.commit()
    return token


def get_session(token: str):
    if not token:
        return None
    h = token_hash(token)
    if DB is None:
        row = MEMORY_SESSIONS.get(h)
    else:
        with DB_LOCK:
            r = DB.execute('SELECT email, naam, verloopt FROM sessies WHERE token_hash = ?', (h,)).fetchone()
        row = tuple(r) if r else None
    if not row or row[2] < time.time():
        return None
    return {'email': row[0], 'naam': row[1]}


def end_session(token: str) -> None:
    h = token_hash(token)
    MEMORY_SESSIONS.pop(h, None)
    if DB is not None:
        with DB_LOCK:
            DB.execute('DELETE FROM sessies WHERE token_hash = ?', (h,))
            DB.commit()


def all_comments() -> list:
    with DB_LOCK:
        rows = DB.execute('SELECT * FROM opmerkingen ORDER BY id').fetchall()
        replies = DB.execute('SELECT * FROM reacties ORDER BY id').fetchall()
    by_comment = {}
    for r in replies:
        by_comment.setdefault(r['opmerking_id'], []).append({'auteur': r['auteur'], 'datum': r['datum'], 'tekst': r['tekst']})
    return [{
        'nummer': r['id'], 'status': r['status'], 'anker': r['anker'], 'onderdeel': r['onderdeel'],
        'opmerking': r['opmerking'], 'auteur': r['auteur'], 'datum': r['datum'],
        'reacties': by_comment.get(r['id'], []),
        'conclusie': r['conclusie'], 'opgelost_door': r['opgelost_door'], 'opgelost_op': r['opgelost_op'],
    } for r in rows]


class Handler(SimpleHTTPRequestHandler):
    server_version = 'moza-roadmap'

    # ---- identiteit: eigen sessie (AUTH=app) of de headers van de authorization-wall
    def cookie(self) -> str:
        for part in (self.headers.get('Cookie') or '').split(';'):
            name, _, value = part.strip().partition('=')
            if name == COOKIE:
                return value
        return ''

    def user(self):
        session = get_session(self.cookie()) if LOGIN else None
        if not session and WALL:
            email = (self.headers.get('X-Forwarded-Email') or self.headers.get('X-Auth-Request-Email') or '').strip().lower()
            username = (self.headers.get('X-Forwarded-Preferred-Username') or self.headers.get('X-Forwarded-User')
                        or self.headers.get('X-Auth-Request-Preferred-Username') or self.headers.get('X-Auth-Request-User') or '').strip()
            if email or username:
                session = {'email': email or username.lower(), 'naam': display_name(email, username)}
        if not session and DEV_USER and not LOGIN:
            session = {'email': DEV_USER.lower(), 'naam': display_name(DEV_USER, '')}
        if not session:
            return None
        return {**session, 'editor': not EDITORS or session['email'] in EDITORS}

    def base_url(self) -> str:
        return BASE_URL or f"https://{self.headers.get('Host', 'localhost')}"

    def redirect(self, location: str, cookie: str = '') -> None:
        self.send_response(HTTPStatus.FOUND)
        self.send_header('Location', location)
        self.send_header('Cache-Control', 'no-store')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def is_public(self, path: str) -> bool:
        return path.lstrip('/') in PUBLIC_PAGES

    def auth_login(self, query: dict) -> None:
        if not LOGIN:
            return self.redirect(safe_path(query.get('rd', ['/'])[0]))
        verifier = b64url(secrets.token_bytes(32))
        state = b64url(secrets.token_bytes(24))
        now_ = time.time()
        for k in [k for k, v in PENDING.items() if v[2] < now_ - 600]:
            PENDING.pop(k, None)
        PENDING[state] = (verifier, safe_path(query.get('rd', ['/'])[0]), now_)
        params = {
            'client_id': OIDC_CLIENT_ID, 'response_type': 'code', 'scope': 'openid email profile',
            'redirect_uri': f'{self.base_url()}/auth/callback', 'state': state,
            'code_challenge': b64url(hashlib.sha256(verifier.encode()).digest()), 'code_challenge_method': 'S256',
        }
        self.redirect(f"{discovery()['authorization_endpoint']}?{urllib.parse.urlencode(params)}")

    def auth_callback(self, query: dict) -> None:
        pending = PENDING.pop(query.get('state', [''])[0], None)
        code = query.get('code', [''])[0]
        if not pending or not code or pending[2] < time.time() - 600:
            return self.send_error(HTTPStatus.BAD_REQUEST, 'Inloggen verlopen of ongeldig; probeer het opnieuw')
        verifier, rd, _ = pending
        form = urllib.parse.urlencode({
            'grant_type': 'authorization_code', 'code': code, 'redirect_uri': f'{self.base_url()}/auth/callback',
            'client_id': OIDC_CLIENT_ID, 'client_secret': OIDC_CLIENT_SECRET, 'code_verifier': verifier,
        }).encode()
        try:
            req = urllib.request.Request(discovery()['token_endpoint'], data=form, headers={'Content-Type': 'application/x-www-form-urlencoded'})
            with urllib.request.urlopen(req, timeout=10) as res:
                tokens = json.load(res)
            req = urllib.request.Request(discovery()['userinfo_endpoint'], headers={'Authorization': f"Bearer {tokens['access_token']}"})
            with urllib.request.urlopen(req, timeout=10) as res:
                info = json.load(res)
        except (OSError, KeyError, ValueError) as err:
            print(f'Inloggen mislukt: {type(err).__name__}')
            return self.send_error(HTTPStatus.BAD_GATEWAY, 'Inloggen mislukt; probeer het opnieuw')
        email = str(info.get('email') or '').lower()
        username = str(info.get('preferred_username') or '')
        naam = str(info.get('name') or '').strip() or display_name(email, username)
        token = new_session(email or username, naam)
        self.redirect(rd, f'{COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age={SESSION_SECONDS}')

    def auth_logout(self, query: dict) -> None:
        end_session(self.cookie())
        rd = safe_path(query.get('rd', ['/'])[0])
        landing = rd if self.is_public(rd) else ('/' + sorted(PUBLIC_PAGES)[0] if PUBLIC_PAGES else '/')
        self.redirect(landing,
                      f'{COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if not self.path.startswith('/api/') and self.path.split('?')[0].endswith(('.html', '/')):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def read_json(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length > MAX_BODY:
            raise ValueError('Bericht te groot')
        data = json.loads(self.rfile.read(length) or b'{}')
        if not isinstance(data, dict):
            raise ValueError('Ongeldig bericht')
        return data

    def text(self, data, key, required=True):
        value = str(data.get(key) or '').strip()
        if required and not value:
            raise ValueError(f'Veld "{key}" ontbreekt')
        return value[:LIMITS[key]]

    # ---- routes
    def do_GET(self):
        path, _, qs = self.path.partition('?')
        query = urllib.parse.parse_qs(qs)
        if path == '/auth/login':
            return self.auth_login(query)
        if path == '/auth/callback':
            return self.auth_callback(query)
        if path == '/auth/logout':
            return self.auth_logout(query)
        if path == '/api/ik':
            return self.send_json(HTTPStatus.OK, {'gebruiker': self.user(), 'opmerkingen': DB is not None, 'inloggen': LOGIN})
        if path.startswith('/api/') and not self.user():
            return self.send_json(HTTPStatus.UNAUTHORIZED, {'fout': 'Niet ingelogd'})
        if path == '/api/opmerkingen':
            if DB is None:
                return self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {'fout': 'Opmerkingen niet beschikbaar'})
            return self.send_json(HTTPStatus.OK, {'opmerkingen': all_comments()})
        if path.startswith('/api/'):
            return self.send_json(HTTPStatus.NOT_FOUND, {'fout': 'Onbekend'})
        # Pagina's: openbaar of achter de inlog
        if LOGIN and not self.is_public(path) and not self.user():
            return self.redirect(f"/auth/login?{urllib.parse.urlencode({'rd': self.path})}")
        return super().do_GET()

    def do_HEAD(self):
        path = self.path.split('?')[0]
        if LOGIN and (path.startswith(('/api/', '/auth/')) or (not self.is_public(path) and not self.user())):
            return self.redirect('/auth/login')
        return super().do_HEAD()

    def do_POST(self):
        path = self.path.split('?')[0]
        # CSRF-bescherming: alleen JSON-verzoeken met een eigen header (gaat niet via een gewoon formulier)
        if self.headers.get('X-Requested-With') != 'roadmap' or 'application/json' not in (self.headers.get('Content-Type') or ''):
            return self.send_json(HTTPStatus.FORBIDDEN, {'fout': 'Ongeldig verzoek'})
        if DB is None:
            return self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {'fout': 'Opmerkingen niet beschikbaar'})
        user = self.user()
        if not user:
            return self.send_json(HTTPStatus.UNAUTHORIZED, {'fout': 'Niet ingelogd'})
        try:
            data = self.read_json()
            if path == '/api/opmerkingen':
                with DB_LOCK:
                    DB.execute('INSERT INTO opmerkingen (anker, onderdeel, opmerking, auteur, email, datum) VALUES (?,?,?,?,?,?)',
                               (self.text(data, 'anker'), self.text(data, 'onderdeel'), self.text(data, 'opmerking'),
                                user['naam'], user['email'], now()))
                    DB.commit()
                return self.send_json(HTTPStatus.CREATED, {'ok': True})
            m = re.fullmatch(r'/api/opmerkingen/(\d+)/(reacties|oplossen|heropenen|verwijderen)', path)
            if not m:
                return self.send_json(HTTPStatus.NOT_FOUND, {'fout': 'Onbekend'})
            comment_id, action = int(m.group(1)), m.group(2)
            with DB_LOCK:
                if not DB.execute('SELECT 1 FROM opmerkingen WHERE id = ?', (comment_id,)).fetchone():
                    return self.send_json(HTTPStatus.NOT_FOUND, {'fout': 'Opmerking bestaat niet'})
                if action == 'reacties':
                    DB.execute('INSERT INTO reacties (opmerking_id, auteur, email, datum, tekst) VALUES (?,?,?,?,?)',
                               (comment_id, user['naam'], user['email'], now(), self.text(data, 'tekst')))
                elif not user['editor']:
                    return self.send_json(HTTPStatus.FORBIDDEN, {'fout': 'Alleen editors kunnen opmerkingen oplossen of verwijderen'})
                elif action == 'verwijderen':
                    # Definitief: de opmerking en alle reacties erop
                    DB.execute('DELETE FROM reacties WHERE opmerking_id = ?', (comment_id,))
                    DB.execute('DELETE FROM opmerkingen WHERE id = ?', (comment_id,))
                elif action == 'oplossen':
                    DB.execute("UPDATE opmerkingen SET status='opgelost', conclusie=?, opgelost_door=?, opgelost_op=? WHERE id=?",
                               (self.text(data, 'conclusie'), user['naam'], now(), comment_id))
                else:
                    DB.execute("UPDATE opmerkingen SET status='open', conclusie='', opgelost_door='', opgelost_op='' WHERE id=?", (comment_id,))
                DB.commit()
            return self.send_json(HTTPStatus.OK, {'ok': True})
        except (ValueError, json.JSONDecodeError) as err:
            return self.send_json(HTTPStatus.BAD_REQUEST, {'fout': str(err)})

    def log_message(self, fmt, *args):
        # Geen querystrings of e-mailadressen in de log
        print(f'{self.command} {self.path.split("?")[0]} {args[1] if len(args) > 1 else ""}')


if __name__ == '__main__':
    print(f'Roadmap op :{PORT} (site: {SITE_DIR}, data: {DATA_DIR}, editors: {", ".join(sorted(EDITORS)) or "iedereen"}, '
          f'inloggen: {"zelf via Keycloak" if LOGIN else "authorization-wall" if WALL else "uit"}, openbaar: {", ".join(sorted(PUBLIC_PAGES)) or "-"})')
    ThreadingHTTPServer(('0.0.0.0', PORT), partial(Handler, directory=SITE_DIR)).serve_forever()
