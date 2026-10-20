# CLAUDE.md

Werkafspraken voor deze repo: de concept-roadmap inlog- en machtigingsmiddelen van MijnOverheid Zakelijk
(MOZa), online op https://roadmap-moza.rijksapp.dev. Zie ook `README.md`.

## Bouwen, bekijken, uitrollen

- De bronpagina's (`*.html`) laden NLDD van esm.sh. `python3 build.py` maakt in `dist/` zelfstandige pagina's
  met alles ingebed: NLDD-script, CSS en lettertypen uit `vendor/nldd/`, `opmerkingen.js`, `begrippen.js`,
  `stappen-presentatie.js` en de afbeeldingen uit `logos/`, `avatars/` en `schermen/`.
- Nieuwe pagina: toevoegen aan `PAGES` in `build.py` en aan de `COPY` in het `Containerfile`.
- Lokaal met opmerkingen en inlog: `SITE_DIR=dist DATA_DIR=.data DEV_USER=voornaam.achternaam@rijksoverheid.nl python3 server.py`.
  Zonder server: `python3 -m http.server` in de map (opmerkingen staan dan uit).
- Een push op `main` bouwt een image en rolt uit naar ZAD (project `mr-7qd`, workflow `deploy.yml`).
- Werkafspraak: collega's werken via een branch en pull request. De beheerder pusht kleine wijzigingen
  direct naar `main`; wijzigingen aan `eherkenning.html` gaan via een pull request.
- Haal altijd eerst de laatste stand op (`git pull --rebase origin main`); er werken meer mensen en sessies aan.

## Inloggen en openbare pagina's

- `server.py` doet het inloggen zelf via Keycloak (SSO Rijk), met `AUTH=app` op ZAD. Openbaar is alleen wat in
  `PUBLIC_PAGES` staat (nu `ebw-landschap.html`); de rest toont de pagina "Inloggen" (`inloggen.html`, één
  sjabloon voor alle inlogmomenten).
- Opmerkingen lezen en plaatsen kan alleen ingelogd.
- Haal `AUTH=app` nooit weg zonder de authorization-wall terug te zetten: zonder `AUTH=app` vertrouwt de
  server identiteits-headers, en zonder wall kan iedereen die meesturen.
- Meer pagina's openzetten: alleen de ZAD-variabele `PUBLIC_PAGES` aanpassen, geen nieuwe release nodig.

## NLDD design system

- Versie 0.8.99 (`@nldd/design-system`). Bouw met `nldd-*`-componenten en DS-tokens. Eigen CSS alleen voor
  gemarkeerde uitzonderingen: SVG-schema's op een licht canvas, de roadmaptabel, het presentatiepaneel.
- Sinds 0.8.62 veranderd: `nldd-shell` (was `nldd-app-view`), `appearance` op knoppen en lijsten (was `variant`;
  lijst `box` heet nu `box-tinted`), `nldd-icon icon=` (was `name=`), `slot="supporting-text"` op `nldd-title`
  (was `subtitle`), `slot="end"` voor een knop naast een titel (was `actions`), kleur `content` (was `default`),
  en `nldd-box` heeft geen eigen padding meer (zet er een `nldd-container padding="16"` in).
- `nldd-list-item` heeft geen `start`/`end`-slot meer: cellen staan in één slot, in volgorde. Een cel met
  `slot="start"` wordt niet getoond. Een nummercel: `<nldd-text-cell width="32px" ...>`.
- Een oude naam faalt stil, zonder foutmelding. Controleer na een wijziging altijd in de browser.

## Presentaties

- Stappenschema's (volgordediagrammen) presenteer je altijd met de skill `stappenpresentatie` en het gedeelde
  `stappen-presentatie.js`: knop "Presenteer de stappen (Shift+P)", paneel links, actieve stap op kleur en de
  rest gedimd. Precies zoals op het EBW-landschap; geen eigen varianten.

## Schrijfstijl en termen

- Nederlands, kort en scanbaar. Geen em-dash (gebruik een gewoon streepje).
- Termen: "machtiging" (niet "mandaat"), "account" (niet "middel"), "herkenningsmakelaar", "leverancier",
  "het werkgeversportaal van UWV", "gemeente Rotterdam" voluit, "Z login" (zo schrijft de leverancier het zelf).
- Persona's: Karin Jansen (eigenaar Koffiezaak Noon), Bilal Yılmaz (werknemer), Yassin Amrani (zzp'er,
  eenmanszaak); avatars uit cx-moza.rijksapp.dev.
- Elke pagina heeft de AI-melding direct onder de titel en een bronvermelding.
- Let op bij zoeken en vervangen: woordstukjes zitten ook in andere woorden ("middel" in "dienstbemiddelaar").
