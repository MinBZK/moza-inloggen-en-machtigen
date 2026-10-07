#!/usr/bin/env python3
"""Bouwt zelfstandige pagina's in dist/: NLDD-script, CSS, lettertypen en logo's worden ingebed.

De bronpagina's (index.html, eherkenning.html) laden NLDD van esm.sh. De versie in dist/ heeft
geen externe bronnen nodig en werkt als los bestand, op elke webserver en zonder internet.

Gebruik: python3 build.py
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).parent
VENDOR = ROOT / 'vendor' / 'nldd'
DIST = ROOT / 'dist'
PAGES = ['index.html', 'eherkenning.html']

CDN_CSS = '<link rel="stylesheet" href="https://esm.sh/@nldd/design-system@0.8.62/dist/css/global.css">'
CDN_JS = '<script type="module" src="https://esm.sh/@nldd/design-system@0.8.62"></script>'
MIME = {'.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml'}


def data_uri(path: Path) -> str:
    return f'data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}'


def inline_css(path: Path) -> str:
    """Lost @import-regels recursief op en zet lettertypen om naar data-URI's."""
    css = path.read_text()
    css = re.sub(r'@import\s+"([^"]+)";', lambda m: inline_css((path.parent / m.group(1)).resolve()), css)
    css = re.sub(r"url\('(\.\./fonts/[^']+)'\)", lambda m: f"url('{data_uri((path.parent / m.group(1)).resolve())}')", css)
    return css


def main() -> None:
    css = inline_css(VENDOR / 'css' / 'global.css')
    js = (VENDOR / 'design-system.bundle.mjs').read_text()
    assert '</script' not in js.lower(), 'bundel bevat </script>, kan niet inline'
    DIST.mkdir(exist_ok=True)
    for name in PAGES:
        html = (ROOT / name).read_text()
        assert CDN_CSS in html and CDN_JS in html, f'{name}: CDN-verwijzingen niet gevonden'
        html = html.replace(CDN_CSS, f'<style>\n{css}\n</style>')
        html = html.replace(CDN_JS, f'<script type="module">\n{js}\n</script>')
        html = re.sub(r'logos/([\w.-]+\.(?:png|svg))', lambda m: data_uri(ROOT / 'logos' / m.group(1)), html)
        (DIST / name).write_text(html)
        print(f'dist/{name}: {len(html) / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()
