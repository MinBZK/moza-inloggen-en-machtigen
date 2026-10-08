#!/usr/bin/env python3
"""Haalt opmerkingen (GitHub-issues met label 'opmerking') op en schrijft ze naar JSON voor de site.

De site leest dit bestand in plaats van de GitHub-API, zodat er geen limiet op het lezen is.
De workflow draait dit bij elke push en bij elke nieuwe, gewijzigde of gesloten opmerking.

Gebruik: python3 opmerkingen.py [uitvoerbestand]   (standaard: dist/opmerkingen.json)
Optioneel: GITHUB_TOKEN in de omgeving voor een hogere limiet.
"""
import json
import os
import re
import sys
import urllib.request

REPO = 'MinBZK/moza-inloggen-en-machtigen'
API = f'https://api.github.com/repos/{REPO}'
TOKEN = os.environ.get('GITHUB_TOKEN')


def get_all(url: str) -> list:
    items = []
    while url:
        headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'moza-roadmap'}
        if TOKEN:
            headers['Authorization'] = f'Bearer {TOKEN}'
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
            items += json.load(resp)
            links = resp.headers.get('Link', '')
        nxt = re.search(r'<([^>]+)>;\s*rel="next"', links)
        url = nxt.group(1) if nxt else None
    return items


def field(body: str, label: str) -> str:
    """Leest een veld uit een issue-formulier ('### Label' gevolgd door de waarde)."""
    m = re.search(rf'^### {label}\s*\n(.*?)(?=^### |\Z)', body or '', re.S | re.M)
    value = m.group(1).strip() if m else ''
    return '' if value == '_No response_' else value


def comment(c: dict) -> dict:
    return {'auteur': c['user']['login'], 'datum': c['created_at'], 'tekst': (c['body'] or '').strip()}


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else 'dist/opmerkingen.json'
    result = []
    for issue in get_all(f'{API}/issues?labels=opmerking&state=all&per_page=100'):
        if 'pull_request' in issue:
            continue
        reacties = [comment(c) for c in get_all(issue['comments_url'] + '?per_page=100')] if issue['comments'] else []
        conclusie = ''
        if issue['state'] == 'closed' and reacties:
            # De conclusie is de laatste reactie die met 'Conclusie' begint, anders de laatste reactie
            idx = next((i for i in range(len(reacties) - 1, -1, -1)
                        if reacties[i]['tekst'].lower().startswith('conclusie')), len(reacties) - 1)
            conclusie = re.sub(r'^conclusie\s*:?\s*', '', reacties.pop(idx)['tekst'], flags=re.I)
        result.append({
            'nummer': issue['number'],
            'url': issue['html_url'],
            'status': 'opgelost' if issue['state'] == 'closed' else 'open',
            'anker': field(issue['body'], 'Anker'),
            'onderdeel': field(issue['body'], 'Onderdeel'),
            'opmerking': field(issue['body'], 'Opmerking') or (issue['body'] or '').strip(),
            'auteur': issue['user']['login'],
            'datum': issue['created_at'],
            'reacties': reacties,
            'conclusie': conclusie,
        })
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    with open(out, 'w') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(f'{out}: {len(result)} opmerkingen')


if __name__ == '__main__':
    main()
