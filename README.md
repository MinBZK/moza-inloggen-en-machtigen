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

- **Option (Mac) of Alt + klik** ergens op de pagina opent een opmerkingenveld op die plek. In de verdieping wordt de opmerking aan het aangeklikte punt gekoppeld.
- Of klik bij een punt in de verdieping op het tekstballon-icoon.

*Taak aanmaken op GitHub* opent een ingevulde taak in [MinBZK/MijnOverheidZakelijk](https://github.com/MinBZK/MijnOverheidZakelijk) met:

- issuetype **Task** en label **Lamarr**;
- als milestone de **volgende Lamarr-sprint**: de sprint na de sprint die vandaag loopt, gekozen op naam (`... - Lamarr`) en einddatum, niet op nummer;
- de vermelding *Onderdeel van #1136*; de workflow hangt de taak daarna ook als sub-issue onder epic [#1136](https://github.com/MinBZK/MijnOverheidZakelijk/issues/1136).

Label, milestone en type worden alleen overgenomen als je triagerechten op MijnOverheidZakelijk hebt; anders kan een beheerder ze aanvullen.

De site ververst opmerkingen elk kwartier (workflow, `opmerkingen.py` schrijft `opmerkingen.json`). Opmerkingen bij een punt staan in de verdieping onder dat punt; opmerkingen op een plek verschijnen als oranje markering. Tegels met open opmerkingen tonen een teller.

**Oplossen** (editors): sluit de taak met een reactie die begint met `Conclusie:`. Dat kan in GitHub of via Claude, bijvoorbeeld:

```bash
gh issue close 1234 -R MinBZK/MijnOverheidZakelijk --comment "Conclusie: tertiaal aangepast naar T1 2028."
```

**Koppelen aan epic #1136** vraagt een repo-secret `MOZ_ISSUES_TOKEN`: een fine-grained token met *Issues: read and write* op MinBZK/MijnOverheidZakelijk. Zonder dit secret slaat de workflow het koppelen over (de vermelding in de taak blijft).

## Licentie

EUPL-1.2. Logo's van DigiD, eHerkenning, de EU Digital Identity Wallet en de European Business Wallet zijn eigendom van hun beheerders en vallen niet onder deze licentie.
