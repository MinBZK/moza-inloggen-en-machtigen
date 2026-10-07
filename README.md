# MOZa - roadmap inlog- en machtigingsmiddelen

Concept-roadmap voor MijnOverheid Zakelijk (MOZa): hoe DigiD, eHerkenning, de EDI-wallet en de European Business Wallet (EBW) per tertiaal (2027-2032) beschikbaar komen, met externe kaders, het MOZa portaal en verkenningen.

**Status: concept.** De planning is indicatief; tertialen na 2028 zijn richtinggevend.

Online: https://minbzk.github.io/moza-inloggen-en-machtigen/

## Opbouw

| Bestand | Inhoud |
|---|---|
| `index.html` | De roadmap. Alle inhoud (sporen, releases, kaders, tabellen) staat als data bovenaan het script: `LANES`, `EXPERIENCE`, `WISHES`, `LOGIN_MATRIX`. |
| `eherkenning.html` | Achtergrondpagina eHerkenning. |
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
3. Maak een branch en open een pull request naar `main`. Direct pushen naar `main` kan niet.
4. GitHub Actions bouwt de site bij de pull request als controle (check `build`); die moet slagen voordat je kunt mergen.
5. Na de merge publiceert GitHub Actions de site op GitHub Pages.

Een zelfstandige versie (bijvoorbeeld om te mailen of elders te publiceren) maak je met `python3 build.py`; het resultaat staat in `dist/`.

## Opmerkingen

Iedereen met een GitHub-account kan opmerkingen plaatsen, net als bij Figma:

1. Open in de roadmap de verdieping van een release.
2. Klik bij een punt op het tekstballon-icoon ("Opmerking plaatsen bij dit punt"), of plaats onderaan een algemene opmerking. GitHub opent een ingevuld formulier; het veld *Anker* koppelt de opmerking aan dat punt.
3. Na het opslaan verschijnt de opmerking binnen ongeveer een minuut in de verdieping, direct onder het punt. Tegels met open opmerkingen tonen een teller.

**Oplossen** (editors): sluit het issue met een reactie die begint met `Conclusie:`. In de verdieping verschijnt het draadje dan als opgelost, met die conclusie. Dat kan in GitHub, of via Claude, bijvoorbeeld:

```bash
gh issue close 12 --comment "Conclusie: tertiaal aangepast naar T1 2028."
```

Opmerkingen zijn issues met label `opmerking`. De workflow haalt ze op met `opmerkingen.py` en publiceert ze als `opmerkingen.json`, zodat de site geen GitHub-API hoeft te bevragen. Lokaal bekijken: `python3 opmerkingen.py opmerkingen.json`.

## Licentie

EUPL-1.2. Logo's van DigiD, eHerkenning, de EU Digital Identity Wallet en de European Business Wallet zijn eigendom van hun beheerders en vallen niet onder deze licentie.
