#!/usr/bin/env python3
"""Server voor de roadmap: levert de site en een kleine API voor opmerkingen.

Draait op ZAD achter de authorization-wall (oauth2-proxy met SSO Rijk). De proxy zet de identiteit
van de ingelogde gebruiker in request-headers; de server vertrouwt die headers alleen omdat de app
uitsluitend via de proxy bereikbaar is. Opmerkingen staan in SQLite op een persistent volume.

Alleen de standaardbibliotheek, zodat de container klein en zonder afhankelijkheden blijft.

Omgevingsvariabelen:
  PORT       poort (standaard 8080)
  SITE_DIR   map met de site (standaard: dist)
  DATA_DIR   map voor de database (standaard: /data; moet schrijfbaar zijn)
  EDITORS    komma-gescheiden e-mailadressen die opmerkingen mogen oplossen; leeg = iedereen
  DEV_USER   alleen lokaal: e-mailadres om als ingelogde gebruiker te testen zonder proxy

Lokaal: SITE_DIR=. DATA_DIR=.data DEV_USER=voornaam.achternaam@rijksoverheid.nl python3 server.py
"""
import datetime
import json
import os
import re
import sqlite3
import threading
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('PORT', '8080'))
SITE_DIR = os.environ.get('SITE_DIR', 'dist')
DATA_DIR = os.environ.get('DATA_DIR', '/data')
EDITORS = {e.strip().lower() for e in os.environ.get('EDITORS', '').split(',') if e.strip()}
DEV_USER = os.environ.get('DEV_USER', '')
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

    # ---- identiteit uit de headers van de authorization-wall
    def user(self):
        email = (self.headers.get('X-Forwarded-Email') or self.headers.get('X-Auth-Request-Email') or '').strip()
        username = (self.headers.get('X-Forwarded-Preferred-Username') or self.headers.get('X-Forwarded-User')
                    or self.headers.get('X-Auth-Request-Preferred-Username') or self.headers.get('X-Auth-Request-User') or '').strip()
        if not email and not username and DEV_USER:
            email = DEV_USER
        if not email and not username:
            return None
        email = email.lower()
        return {'email': email, 'naam': display_name(email, username), 'editor': not EDITORS or email in EDITORS}

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
        path = self.path.split('?')[0]
        if path == '/api/ik':
            return self.send_json(HTTPStatus.OK, {'gebruiker': self.user(), 'opmerkingen': DB is not None})
        if path == '/api/opmerkingen':
            if DB is None:
                return self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {'fout': 'Opmerkingen niet beschikbaar'})
            return self.send_json(HTTPStatus.OK, {'opmerkingen': all_comments()})
        if path.startswith('/api/'):
            return self.send_json(HTTPStatus.NOT_FOUND, {'fout': 'Onbekend'})
        return super().do_GET()

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
            m = re.fullmatch(r'/api/opmerkingen/(\d+)/(reacties|oplossen|heropenen)', path)
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
                    return self.send_json(HTTPStatus.FORBIDDEN, {'fout': 'Alleen editors kunnen opmerkingen oplossen'})
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
    print(f'Roadmap op :{PORT} (site: {SITE_DIR}, data: {DATA_DIR}, editors: {", ".join(sorted(EDITORS)) or "iedereen"})')
    ThreadingHTTPServer(('0.0.0.0', PORT), partial(Handler, directory=SITE_DIR)).serve_forever()
