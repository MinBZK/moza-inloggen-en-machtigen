# MOZa - roadmap inlog- en machtigingsmiddelen

Concept-roadmap voor MijnOverheid Zakelijk (MOZa): hoe DigiD, eHerkenning, de EDI-wallet en de European Business Wallet (EBW) per tertiaal (2027-2032) beschikbaar komen, met externe kaders, het MOZa portaal en verkenningen.

**Status: concept.** De planning is indicatief; tertialen na 2028 zijn richtinggevend.

Online (intern, achter SSO Rijk): https://roadmap-moza.rijksapp.dev (ZAD-project `mr-7qd`).

## Opbouw

| Bestand | Inhoud |
|---|---|
| `index.html` | De roadmap. Alle inhoud (sporen, releases, kaders, tabellen) staat als data bovenaan het script: `LANES`, `EXPERIENCE`, `WISHES`, `LOGIN_MATRIX`. |
| `eherkenning.html` | Achtergrondpagina eHerkenning. |
| `ebw.html` | Achtergrondpagina EBW, met links naar: |
| `ebw-landschap.html` | Schema EBW-landschap (PuB- en Q-EBW). |
| `ebw-flows.html` | Interactieve wallet-flows (overgenomen van plak.rijks.app; eigen opmaak, wordt ongewijzigd meegekopieerd). |
| `logos/` | Officiële logo's (licht en donker). |
| `vendor/nldd/` | NLDD design system 0.8.62 (script, CSS, lettertypen), lokaal meegeleverd. |
| `build.py` | Bouwt zelfstandige pagina's in `dist/` met alles ingebed. |

De pagina's zijn gebouwd met het [NLDD design system](https://minbzk.github.io/storybook/). Eigen CSS is beperkt tot één gemarkeerd blok voor de roadmaptabel (bevroren kolom en kopregel, jaarlijnen, afhankelijkheidslijnen, stippelrand).

## Wijzigen

1. Pas `index.html` of `eherkenning.html` aan.
2. Bekijk het lokaal:

   ```bash
   python3 -m http.server 8905
   ```

   en open http://localhost:8905.
3. Maak een branch en open een pull request naar `main` (beheerders kunnen direct pushen).
4. GitHub Actions bouwt de site bij de pull request als controle (check `build`); die moet slagen voordat je kunt mergen.
5. Na de merge bouwt GitHub Actions het image en rolt het uit naar ZAD.

Een zelfstandige versie (bijvoorbeeld om te mailen of elders te publiceren) maak je met `python3 build.py`; het resultaat staat in `dist/`.

## Opmerkingen

Opmerkingen staan op de site zelf. Je bent ingelogd met je rijksaccount (SSO Rijk); je naam komt daaruit.

- **Plaatsen:** Option (Mac) of Alt + klik ergens op de pagina, of de tekstballon bij een punt in de verdieping. Een opmerking bij een punt staat in de verdieping onder dat punt; een opmerking op een plek verschijnt als oranje markering. Tegels met open opmerkingen tonen een teller.
- **Reageren:** knop *Reageren* bij een draadje.
- **Oplossen** (editors): knop *Oplossen* met een conclusie; *Heropenen* kan altijd. Wie editor is, regelt de omgevingsvariabele `EDITORS` (komma-gescheiden e-mailadressen; leeg = iedereen).
- **Via Claude:** Claude kan opmerkingen oplossen via het browserpaneel, nadat je daar met SSO Rijk bent ingelogd.

## Techniek

- `server.py` levert de site en de API (`/api/ik`, `/api/opmerkingen`, `/api/opmerkingen/<id>/reacties|oplossen|heropenen`). Alleen de standaardbibliotheek; opslag in SQLite op het persistent volume `/data`.
- De identiteit komt uit de headers van de authorization-wall (oauth2-proxy met SSO Rijk). De app is alleen via die proxy bereikbaar.
- `Containerfile` bouwt de zelfstandige pagina's en de server in één image. De workflow bouwt het image bij elke push op `main` en rolt het uit naar ZAD (secret `ZAD_API_KEY`).
- Lokaal met opmerkingen:

  ```bash
  SITE_DIR=. DATA_DIR=.data DEV_USER=voornaam.achternaam@rijksoverheid.nl PORT=8906 python3 server.py
  ```

## Licentie

EUPL-1.2. Logo's van DigiD, eHerkenning, de EU Digital Identity Wallet en de European Business Wallet zijn eigendom van hun beheerders en vallen niet onder deze licentie.
