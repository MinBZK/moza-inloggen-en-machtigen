#!/usr/bin/env python3
"""Haalt roadmap-opmerkingen en Lamarr-milestones op en schrijft ze naar JSON voor de site.

Opmerkingen zijn taken in MinBZK/MijnOverheidZakelijk met label 'Lamarr', geplaatst vanuit de roadmap
(herkenbaar aan de markering ROADMAP_MARK in de tekst). De site leest dit bestand in plaats van de
GitHub-API, zodat er geen limiet op het lezen is.

Met MOZ_ISSUES_TOKEN (schrijfrechten op issues in MijnOverheidZakelijk) worden nieuwe opmerkingen
ook als sub-issue onder epic #PARENT gehangen.

Gebruik: python3 opmerkingen.py [uitvoerbestand]   (standaard: dist/opmerkingen.json)
"""
import datetime
import json
import os
import re
import sys
import urllib.request

SOURCE = 'MinBZK/MijnOverheidZakelijk'
API = f'https://api.github.com/repos/{SOURCE}'
LABEL = 'Lamarr'
PARENT = 1136
ROADMAP_MARK = 'roadmap-moza-inloggen'
READ_TOKEN = os.environ.get('GITHUB_TOKEN')
WRITE_TOKEN = os.environ.get('MOZ_ISSUES_TOKEN')


def request(url: str, token=None, method='GET', data=None):
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'moza-roadmap', 'X-GitHub-Api-Version': '2022-11-28'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, headers=headers, method=method, data=body)
    return urllib.request.urlopen(req)


def get_all(url: str, token=READ_TOKEN) -> list:
    items = []
    while url:
        with request(url, token) as resp:
            items += json.load(resp)
            links = resp.headers.get('Link', '')
        nxt = re.search(r'<([^>]+)>;\s*rel="next"', links)
        url = nxt.group(1) if nxt else None
    return items


def field(body: str, label: str) -> str:
    """Leest een veld ('### Label' gevolgd door de waarde) uit de tekst van een taak."""
    m = re.search(rf'^### {label}\s*\n(.*?)(?=^### |^---|\Z)', body or '', re.S | re.M)
    value = m.group(1).strip() if m else ''
    return '' if value == '_No response_' else value


def comment(c: dict) -> dict:
    return {'auteur': c['user']['login'], 'datum': c['created_at'], 'tekst': (c['body'] or '').strip()}


def link_to_parent(issues: list) -> None:
    if not WRITE_TOKEN:
        print('MOZ_ISSUES_TOKEN ontbreekt: koppelen aan epic overgeslagen')
        return
    linked = {i['id'] for i in get_all(f'{API}/issues/{PARENT}/sub_issues?per_page=100', WRITE_TOKEN)}
    for issue in issues:
        if issue['id'] in linked:
            continue
        try:
            request(f'{API}/issues/{PARENT}/sub_issues', WRITE_TOKEN, 'POST', {'sub_issue_id': issue['id']}).close()
            print(f'#{issue["number"]} gekoppeld aan epic #{PARENT}')
        except urllib.error.HTTPError as err:
            print(f'#{issue["number"]} niet gekoppeld: {err.code} {err.reason}')


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else 'dist/opmerkingen.json'
    issues = [i for i in get_all(f'{API}/issues?labels={LABEL}&state=all&per_page=100')
              if 'pull_request' not in i and ROADMAP_MARK in (i['body'] or '')]
    link_to_parent(issues)

    opmerkingen = []
    for issue in issues:
        reacties = [comment(c) for c in get_all(issue['comments_url'] + '?per_page=100')] if issue['comments'] else []
        conclusie = ''
        if issue['state'] == 'closed' and reacties:
            # De conclusie is de laatste reactie die met 'Conclusie' begint, anders de laatste reactie
            idx = next((i for i in range(len(reacties) - 1, -1, -1)
                        if reacties[i]['tekst'].lower().startswith('conclusie')), len(reacties) - 1)
            conclusie = re.sub(r'^conclusie\s*:?\s*', '', reacties.pop(idx)['tekst'], flags=re.I)
        opmerkingen.append({
            'nummer': issue['number'],
            'url': issue['html_url'],
            'status': 'opgelost' if issue['state'] == 'closed' else 'open',
            'anker': field(issue['body'], 'Anker'),
            'onderdeel': field(issue['body'], 'Onderdeel'),
            'opmerking': field(issue['body'], 'Opmerking'),
            'auteur': issue['user']['login'],
            'datum': issue['created_at'],
            'reacties': reacties,
            'conclusie': conclusie,
        })

    milestones = sorted(
        ({'nummer': m['number'], 'titel': m['title'], 'einddatum': (m['due_on'] or '')[:10]}
         for m in get_all(f'{API}/milestones?state=open&per_page=100')
         if m['title'].strip().endswith(f'- {LABEL}') and m['due_on']),
        key=lambda m: m['einddatum'])

    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    with open(out, 'w') as f:
        json.dump({'bijgewerkt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
                   'milestones': milestones, 'opmerkingen': opmerkingen}, f, ensure_ascii=False, indent=1)
    print(f'{out}: {len(opmerkingen)} opmerkingen, {len(milestones)} Lamarr-milestones')


if __name__ == '__main__':
    main()
