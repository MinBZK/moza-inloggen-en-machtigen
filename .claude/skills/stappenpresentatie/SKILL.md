---
name: stappenpresentatie
description: Een volgordediagram (stappenschema) op de roadmap-site presenteerbaar maken, met het paneel links zoals op het EBW-landschap. Gebruik dit bij elke nieuwe of gewijzigde flow met stappen, zodat alle presentaties gelijk werken en eruitzien. Niet voor de schermvullende landschap-presentatie (Shift+P op ebw-landschap.html).
---

# Stappenpresentatie

Alle stappenschema's op de roadmap-site werken en ogen hetzelfde als de presentatie
"Van nieuwe EBW tot machtiging" op `ebw-landschap.html?presentatie=flow`. Verzin geen eigen variant:
geen andere knoptekst, geen eigen paneel, geen extra markeringen (hoverbanden, ringen, pictogrammen).
De gedeelde implementatie staat in `stappen-presentatie.js`; `build.py` bakt die in.

## Wat de gebruiker ziet

- Boven het schema de knop **Presenteer de stappen**.
- Een klik op een stap of op de knop opent links een paneel (600px); de pagina schuift op en schaalt mee.
- In het schema blijft de actieve stap op kleur; alle andere stappen dimmen tot 20%.
- Het paneel:
  - kopregel: `<naam presentatie> · Stap n · <kenmerk> · <kenmerk>`
  - titel `Stap n` met een geel onderschrift (korte kop)
  - soort stap als badge: Handeling, Verzoek, Controle, Verklaring, Resultaat of Bevraging, met uitleg
  - de leadzin (wat er gebeurt), daarna een opsomming
  - in de opsomming: aannames als **Aanname.** en open vragen als **Open vraag Vn.**
  - gegevens of een echt scherm in een witte kaart; eventueel een bronregel
  - voet: sluiten, teller, "← → bladeren · Esc sluit", vorige/volgende
- Pijltjestoetsen, Home/End en Esc; Enter of spatie op een stapnummer opent die stap.
- Option/Alt + klik blijft voor opmerkingen.

## Hoe je het toepast

1. **Schema:** een `<div class="canvas" id="...-schema">` met daarin de SVG. Geef alle onderdelen van een
   stap (onzichtbaar klikvlak, pijl of vak, cirkel, nummer, labels) `data-stap="n"`. Het nummer is een
   `<circle data-stap>` direct gevolgd door `<text data-stap>`.
2. **Knop** direct onder de sectietitel:

   ```html
   <nldd-button id="presenteer-stappen" appearance="neutral-tinted" size="sm" start-icon="desk-with-screen"
     text="Presenteer de stappen" accessible-label="Presenteer de stappen uit het schema hieronder"></nldd-button>
   <nldd-spacer size="12"></nldd-spacer>
   ```

3. **Gegevens** als JSON in een `<script type="application/json" id="stappen-data">` onderaan de pagina:

   ```json
   { "naam": "Bilal logt in bij UWV", "schema": "#flow-schema", "stappen": [
     { "n": "2", "kop": "inlogverzoek", "kenmerken": ["Van UWV, via de browser", "eid.digidentity.eu"],
       "soort": ["Verzoek", "van UWV, via de browser", "#b46504"],
       "lead": "UWV stuurt een inlogverzoek naar zijn herkenningsmakelaar",
       "punten": ["Het verzoek is anoniem.", "..."],
       "aannames": ["..."], "vragen": [["V3", "Vraag?", "Toelichting."]],
       "kaarten": [{ "label": "Scherm", "titel": "Wat Bilal ziet", "bij": "eid.digidentity.eu",
                     "img": "schermen/uwv-2-makelaar.jpg", "alt": "..." }],
       "bron": "Scherm nagelopen op 20 oktober 2026." } ] }
   ```

   Kleuren van de soorten: Handeling `#2d7a46`, Verzoek `#b46504`, Controle en Bevraging `#7a4f8c`,
   Verklaring `#1f5fa8`, Resultaat `#0e7c86`. Een kaart met gegevensvelden gebruikt
   `"rijen": [[veld, waarde, uitleg]]` in plaats van `img`.

4. **Script:** `<script type="module" src="stappen-presentatie.js"></script>` (na het gegevensblok).
5. **Bouwen en testen:** `python3 build.py`, en lokaal in de browser: knop, klik op een stap, bladeren, Esc.
   Een nieuwe pagina moet ook in `PAGES` in `build.py` en in de `COPY` van het `Containerfile`.

## Valkuilen

- Zet nooit een letterlijke script-tag in `stappen-presentatie.js` (ook niet in commentaar): het script
  wordt ingebakken en zo'n tag sluit het te vroeg af. `build.py` controleert hierop.
- Schrijf kenmerken en soort-uitleg met de juiste hoofdletters (UWV, MOZa), dus niet via `capitalize()`.
- Tekst in het paneel kort en scanbaar: een leadzin plus korte punten, geen lange alinea.
- Schrijfstijl van de site: geen em-dash, "account" (niet "middel"), "machtiging" (niet "mandaat"),
  "herkenningsmakelaar".
