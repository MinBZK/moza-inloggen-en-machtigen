// ============================================================
//  Uitleg bij afkortingen en begrippen op de roadmap (DigiD, eHerkenning, wallets)
//  Naar het voorbeeld van afkortingen.js op de MOZa CX-site: een begrip krijgt een
//  stippellijn en toont bij aanwijzen, toetsenbord-focus of tik een korte uitleg.
//  Nieuw begrip? Voeg het toe aan BEGRIPPEN hieronder.
//  Anders dan op de CX-site staat veel tekst hier in cellen van het design system
//  (shadow DOM) en wordt de pagina door script opgebouwd: daarom zoekt dit script ook
//  in die cellen en loopt het opnieuw als er inhoud bijkomt (bijv. de verdieping).
// ============================================================
(function () {
  'use strict';

  var BEGRIPPEN = {
    // ---- DigiD
    'DigiD Machtigen': { u: 'Voorziening waarmee iemand een ander machtigt om namens hem zaken met de overheid te regelen. De gemachtigde logt in met zijn eigen DigiD.', l: 'https://machtigen.digid.nl/' },
    'DigiD Substantieel': { u: 'DigiD op betrouwbaarheidsniveau substantieel: inloggen met de DigiD-app nadat je identiteitsbewijs eenmalig is gecontroleerd.', l: 'https://www.digid.nl/' },
    'DigiD Hoog': { u: 'DigiD op het hoogste betrouwbaarheidsniveau: inloggen met de chip in je identiteitsbewijs of rijbewijs.', l: 'https://www.digid.nl/' },
    'DigiD-app': { u: 'App waarmee je met een pincode inlogt met DigiD, zonder gebruikersnaam en wachtwoord.', l: 'https://www.digid.nl/' },
    'DigiD': { u: 'Inlogmiddel van de Nederlandse overheid voor burgers. Een eenmanszaak of zzp\'er kan er ook zakelijk mee inloggen.', l: 'https://www.digid.nl/' },
    'BSN': { u: 'Burgerservicenummer: het persoonsnummer waarmee de overheid een burger identificeert.' },
    // ---- eHerkenning
    'eHerkenningsstelsel': { u: 'Het afsprakenstelsel achter eHerkenning: de regels waaraan leveranciers, makelaars en dienstverleners zich houden. Logius beheert het.', l: 'https://www.eherkenning.nl/' },
    'eHerkenningsleverancier': { u: 'Commerciële partij die eHerkenningsmiddelen uitgeeft en bijhoudt wie namens een onderneming gemachtigd is.', l: 'https://www.eherkenning.nl/' },
    'eHerkenning': { u: 'Inlogmiddel waarmee ondernemers en medewerkers namens hun organisatie inloggen bij de overheid. Je neemt het af bij een commerciële leverancier.', l: 'https://www.eherkenning.nl/' },
    'EH2': { u: 'eHerkenning betrouwbaarheidsniveau 2+ (laag): gebruikersnaam en wachtwoord met een extra controle.', l: 'https://www.eherkenning.nl/' },
    'EH3': { u: 'eHerkenning betrouwbaarheidsniveau 3 (substantieel): het niveau dat de meeste overheidsdiensten vragen.', l: 'https://www.eherkenning.nl/' },
    'EH4': { u: 'eHerkenning betrouwbaarheidsniveau 4 (hoog): het hoogste niveau, met strengere controle van de identiteit.', l: 'https://www.eherkenning.nl/' },
    'herkenningsmakelaar': { u: 'Partij in het eHerkenningsstelsel die een dienstverlener aansluit en inlogverzoeken doorstuurt naar de leverancier van de gebruiker.' },
    'dienstencatalogus': { u: 'Overzicht van alle diensten die op eHerkenning zijn aangesloten, met per dienst het vereiste betrouwbaarheidsniveau. Machtigingen worden per dienst uit deze catalogus vastgelegd.' },
    'ketenmachtiging': { u: 'Machtiging waarbij een onderneming een intermediair machtigt, die op zijn beurt eigen medewerkers laat handelen.' },
    'betrouwbaarheidsniveau': { u: 'Mate van zekerheid over wie er inlogt: laag, substantieel of hoog. Een dienst bepaalt welk niveau minimaal nodig is.' },
    // ---- Wallets
    'EDI-wallet': { u: 'Europese digitale identiteitswallet (ook EUDI-wallet): persoonlijke app waarmee iemand zijn identiteit en andere bewijzen toont. In Nederland de NL Wallet.', l: 'https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET/' },
    'EUDI-wallet': { u: 'European Digital Identity Wallet: persoonlijke app waarmee iemand zijn identiteit en andere bewijzen toont. In Nederland de NL Wallet.', l: 'https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET/' },
    'NL Wallet': { u: 'De Nederlandse publieke EDI-wallet, ontwikkeld door de overheid.' },
    'EBW-verordening': { u: 'Het Europese voorstel voor de European Business Wallet, COM(2025) 838. De planning hangt af van wanneer de verordening en de uitvoeringshandelingen vaststaan.' },
    'EBW': { u: 'European Business Wallet: zakelijke wallet voor ondernemingen en publieke organisaties, met attestaties over de organisatie en mandaten voor medewerkers.' },
    'business wallet': { u: 'Zakelijke wallet van een organisatie (de European Business Wallet, EBW): bevat attestaties over de organisatie en legt vast wie namens haar mag handelen.' },
    'PID': { u: 'Person Identification Data: de persoonsidentificatiegegevens in de EDI-wallet, uitgegeven door de overheid op het hoogste betrouwbaarheidsniveau.' },
    'KvK-attestatie': { u: 'Digitale verklaring van de KVK uit het Handelsregister, bijvoorbeeld dat iemand bevoegd vertegenwoordiger van een onderneming is.' },
    'attestatie': { u: 'Digitaal, verifieerbaar bewijs van een gegeven of bevoegdheid dat in een wallet staat, zoals een diploma, een inschrijving of een mandaat.' },
    'relying party': { u: 'De partij die een attestatie uit een wallet opvraagt en controleert, bijvoorbeeld een dienstverlener of MOZa.' },
    'verifier': { u: 'De partij die een attestatie uit een wallet controleert; hetzelfde als relying party.' },
    'QES': { u: 'Qualified Electronic Signature: gekwalificeerde elektronische handtekening, juridisch gelijk aan een handgeschreven handtekening.' },
    'eIDAS 2.0': { u: 'De herziene Europese verordening voor digitale identiteit, Verordening (EU) 2024/1183. Regelt de EDI-wallet en verplicht overheidsdiensten die te accepteren.', l: 'https://eur-lex.europa.eu/eli/reg/2024/1183/oj' },
    'eIDAS': { u: 'Europese verordening voor elektronische identificatie en vertrouwensdiensten. Zorgt dat inlogmiddelen uit het ene EU-land in het andere worden erkend.', l: 'https://eur-lex.europa.eu/eli/reg/2024/1183/oj' },
    'European login': { u: 'Inloggen met een erkend inlogmiddel uit een ander EU-land, via eIDAS.' },
    'uitvoeringshandeling': { u: 'Europese uitvoeringsregel waarin de technische en praktische details van een verordening worden vastgelegd.' },
    'EUID': { u: 'European Unique Identifier: het Europese unieke nummer van een onderneming uit het handelsregister.' },
    'OOTS': { u: 'Once-Only Technical System: Europees systeem waarmee overheden op verzoek van een ondernemer bewijsstukken rechtstreeks bij elkaar ophalen.' },
    // ---- Machtigen en registers
    'Handelsregister': { u: 'Het register van de KVK met alle ondernemingen en rechtspersonen in Nederland, inclusief wie bevoegd is om namens hen te handelen.', l: 'https://www.kvk.nl/' },
    'KvK': { u: 'Kamer van Koophandel: beheert het Handelsregister.', l: 'https://www.kvk.nl/' },
    'KVK': { u: 'Kamer van Koophandel: beheert het Handelsregister.', l: 'https://www.kvk.nl/' },
    'gemachtigde': { u: 'Iemand die van een onderneming of persoon toestemming heeft om namens die ander zaken te regelen.' },
    'mandaat': { u: 'Vastgelegde bevoegdheid om namens een organisatie een bepaalde handeling te doen; in de wallet een attestatie.' },
    'SSO': { u: 'Single sign-on: één keer inloggen geeft toegang tot meerdere diensten.' },
  };

  // Schrijfwijzen die naar hetzelfde begrip verwijzen
  var ALIAS = { 'Business Wallet': 'business wallet', 'business wallets': 'business wallet', 'attestaties': 'attestatie', 'Attestatie': 'attestatie',
    'uitvoeringshandelingen': 'uitvoeringshandeling', 'Uitvoeringshandelingen': 'uitvoeringshandeling', 'mandaten': 'mandaat', 'Mandaat': 'mandaat', 'Mandaten': 'mandaat',
    'gemachtigden': 'gemachtigde', 'Gemachtigde': 'gemachtigde', 'Betrouwbaarheidsniveau': 'betrouwbaarheidsniveau', 'betrouwbaarheidsniveaus': 'betrouwbaarheidsniveau',
    'Herkenningsmakelaar': 'herkenningsmakelaar', 'Dienstencatalogus': 'dienstencatalogus', 'EDI-wallets': 'EDI-wallet', 'handelsregister': 'Handelsregister' };

  var KEYS = Object.keys(BEGRIPPEN).concat(Object.keys(ALIAS)).sort(function (a, b) { return b.length - a.length; });
  var esc = function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var RE = new RegExp('(?<![A-Za-z0-9])(' + KEYS.map(esc).join('|') + ')(?![A-Za-z0-9])');
  var begripVan = function (tekst) { return ALIAS[tekst] || tekst; };

  // Geen uitleg in knoppen, links, labels, overlines en de onderdelen van dit script zelf
  var SKIP = 'a, button, script, style, kbd, svg, .afk, .afk-tip, nldd-tag, nldd-badge, nldd-button, nldd-link, nldd-icon-button, [slot="overline"], [id^="opm-"], #comment-popover';
  // Cellen van het design system waarvan de tekst in de shadow DOM staat
  var CELLEN = 'nldd-text-cell, nldd-title-cell';
  var STIJL = '.afk{font:inherit;color:inherit;letter-spacing:inherit;background:none;border:none;padding:0;margin:0;' +
    'border-bottom:1px dotted currentColor;cursor:help;border-radius:2px;text-align:inherit;}' +
    '.afk:focus-visible{outline:2px solid #ffbf00;outline-offset:1px;}' +
    '@media print{.afk{border-bottom:none;}}';

  // Eén uitleg per begrip per blok: alleen het eerste voorkomen in dat blok krijgt een stippellijn
  function wrap(root, gezien) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var el = n.parentElement;
        if (!el || el.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var blok = gezien || blokVan(node);
      var frag = document.createDocumentFragment();
      var rest = node.nodeValue;
      var gewijzigd = false;
      var m;
      while ((m = RE.exec(rest))) {
        var sleutel = begripVan(m[1]);
        if (blok[sleutel]) {
          frag.appendChild(document.createTextNode(rest.slice(0, m.index + m[1].length)));
          rest = rest.slice(m.index + m[1].length);
          continue;
        }
        blok[sleutel] = true;
        gewijzigd = true;
        if (m.index > 0) frag.appendChild(document.createTextNode(rest.slice(0, m.index)));
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'afk';
        b.dataset.afk = sleutel;
        b.setAttribute('aria-expanded', 'false');
        b.textContent = m[1];
        frag.appendChild(b);
        rest = rest.slice(m.index + m[1].length);
      }
      if (!gewijzigd) return;
      if (rest) frag.appendChild(document.createTextNode(rest));
      node.parentNode.replaceChild(frag, node);
    });
  }
  // Blok in de gewone pagina: een tegel, lijstregel, sectie of de verdieping
  var blokken = new WeakMap();
  function blokVan(node) {
    var el = node.parentElement.closest('nldd-card, nldd-box, nldd-list-item, nldd-table-row, nldd-banner, nldd-rich-text, nldd-title, nldd-page-footer') || document.body;
    if (!blokken.has(el)) blokken.set(el, {});
    return blokken.get(el);
  }

  var st = document.createElement('style');
  st.textContent = STIJL +
    '.afk-tip{position:fixed;inset:auto;margin:0;border:none;max-width:320px;padding:10px 12px;border-radius:8px;' +
    'font-family:"RijksSans",system-ui,sans-serif;font-size:13px;line-height:1.5;font-weight:400;text-align:left;' +
    'background:light-dark(#1a1a2e,#f2f3f7);color:light-dark(#fff,#1a1a2e);box-shadow:0 6px 24px rgba(0,0,0,.28);}' +
    '.afk-tip strong{font-weight:700;}' +
    '.afk-tip a{color:inherit;font-weight:600;display:inline-block;margin-top:4px;}' +
    '@media print{.afk-tip{display:none !important;}}';
  document.head.appendChild(st);

  // Eén gedeelde uitleg; als popover, zodat hij ook boven de verdieping (een dialoogvenster) komt
  var tip = document.createElement('div');
  tip.className = 'afk-tip';
  tip.id = 'afk-tip';
  tip.setAttribute('role', 'tooltip');
  if ('popover' in tip) tip.setAttribute('popover', 'manual'); else tip.hidden = true;
  document.body.appendChild(tip);
  var open = false;
  function zetTip(aan) {
    open = aan;
    if (tip.hasAttribute('popover')) {
      if (tip.matches(':popover-open')) tip.hidePopover();
      if (aan) tip.showPopover();
    } else { tip.hidden = !aan; }
  }

  var huidige = null;
  var verbergTimer = null;
  function toon(btn) {
    var d = BEGRIPPEN[btn.dataset.afk];
    if (!d) return;
    window.clearTimeout(verbergTimer);
    if (huidige === btn && open) return;
    if (huidige && huidige !== btn) huidige.setAttribute('aria-expanded', 'false');
    huidige = btn;
    btn.setAttribute('aria-expanded', 'true');
    tip.innerHTML = '';
    var sterk = document.createElement('strong');
    sterk.textContent = btn.dataset.afk;
    tip.appendChild(sterk);
    tip.appendChild(document.createTextNode(' · ' + d.u));
    if (d.l) {
      tip.appendChild(document.createElement('br'));
      var a = document.createElement('a');
      a.href = d.l; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = (d.lt || 'Meer informatie') + ' ↗';
      tip.appendChild(a);
    }
    zetTip(true);
    var r = btn.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 8));
    var y = r.bottom + 8 + th > window.innerHeight ? r.top - th - 8 : r.bottom + 8;
    tip.style.left = x + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function verberg() {
    if (huidige) huidige.setAttribute('aria-expanded', 'false');
    huidige = null;
    zetTip(false);
  }
  function verbergStraks() {
    window.clearTimeout(verbergTimer);
    verbergTimer = window.setTimeout(verberg, 200);
  }
  // Het begrip onder de muis of in focus, ook binnen een cel van het design system
  function afkVan(e) {
    var pad = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < pad.length; i++) {
      var el = pad[i];
      if (el.classList && el.classList.contains('afk')) return el;
      if (el === tip) return tip;
    }
    return null;
  }

  document.addEventListener('mouseover', function (e) {
    var b = afkVan(e);
    if (b === tip) { window.clearTimeout(verbergTimer); return; }
    if (b) { toon(b); return; }
    if (huidige) verbergStraks();
  });
  document.addEventListener('focusin', function (e) {
    var b = afkVan(e);
    if (b && b !== tip) toon(b); else if (huidige && b !== tip) verberg();
  });
  document.addEventListener('click', function (e) {
    // Option/Alt + klik is voor opmerkingen: daar bemoeit dit script zich niet mee
    if (e.altKey) return;
    var b = afkVan(e);
    if (b && b !== tip) {
      e.preventDefault(); e.stopPropagation();
      if (huidige === b && open) verberg(); else toon(b);
      return;
    }
    if (b !== tip) verberg();
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') verberg(); });
  window.addEventListener('scroll', verberg, true);
  window.addEventListener('resize', verberg);

  // Hele pagina doorlopen: gewone tekst en de tekst in cellen van het design system
  function verwerk() {
    wrap(document.body);
    document.querySelectorAll(CELLEN).forEach(function (cel) {
      var sr = cel.shadowRoot;
      if (!sr) return;
      if (!sr.querySelector('style[data-afk]')) {
        var s = document.createElement('style');
        s.setAttribute('data-afk', '');
        s.textContent = STIJL;
        sr.appendChild(s);
      }
      // Eén uitleg per begrip per tabelrij of lijstregel, niet per cel: anders staat de tabel vol stippellijnen
      var rij = cel.closest('nldd-table-row, nldd-list-item') || cel;
      if (!rij.__afkGezien) rij.__afkGezien = {};
      wrap(sr, rij.__afkGezien);
    });
  }
  // De pagina wordt door script opgebouwd en de verdieping komt later: opnieuw doorlopen als er inhoud bijkomt
  var timer = null;
  function plan() { window.clearTimeout(timer); timer = window.setTimeout(verwerk, 250); }
  new MutationObserver(function (wijzigingen) {
    for (var i = 0; i < wijzigingen.length; i++) {
      var w = wijzigingen[i];
      if (w.target === tip || (w.target.closest && w.target.closest('.afk-tip'))) continue;
      if (w.addedNodes.length) { plan(); return; }
    }
  }).observe(document.body, { childList: true, subtree: true });
  // Cellen tekenen hun tekst pas na het laden van het design system
  if (window.customElements && customElements.whenDefined) customElements.whenDefined('nldd-text-cell').then(function () { window.setTimeout(verwerk, 300); });
  plan();
})();
