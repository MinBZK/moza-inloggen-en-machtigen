// Stappenpresentatie: één gedeelde opbouw voor alle stappenschema's op de roadmap-site, gelijk aan de
// presentaties op het EBW-landschap (ebw-machtigen.html?presentatie#/0). Paneel links, de pagina schuift
// op, de actieve stap blijft op kleur en de andere stappen dimmen tot 20%.
//
// Gebruik in een pagina:
//   - een knop  <nldd-button id="presenteer-stappen" appearance="neutral-tinted" size="sm"
//                 start-icon="desk-with-screen" text="Presenteer de stappen (Shift+P)"></nldd-button>
//   - een schema <div class="canvas" id="..."><svg> met data-stap="n" op alle onderdelen van een stap
//   - de gegevens als JSON in een script-element van het type application/json met id="stappen-data":
//     { "naam": ..., "schema": "#id", "stappen": [...] } (optioneel "stapnaam", standaard "Stap", bv. "Toelichting")
//   - dit bestand als module-script (src="stappen-presentatie.js"); build.py bakt het in
// Een stap: { n, kop, kenmerken: [..], soort: [naam, uitleg, kleur], lead, punten: [tekst of [tekst, [subpunten]]],
//             opties: { tekst, items: [[label, tekst, [subpunten]]] }, aannames: [..],
//             vragen: [[V1, vraag, toelichting of [subpunten]]], kaarten: [{ label, titel, bij, img, alt, rijen: [[veld, waarde, uitleg]] }], bron }
// Optioneel "reeks": meerdere presentaties op losse pagina's met één overzicht (slide 0), zoals op het EBW-landschap:
//   { titel, sub, items: [{ href, soort, naam, uitleg, stappen }] }. Het paneel krijgt dan "← Alle presentaties",
//   terug vanaf de eerste stap gaat naar het overzicht, en ?presentatie (zonder #) opent het overzicht,
//   ?presentatie#/n opent de presentatie van deze pagina op stap n.

const bron = document.getElementById('stappen-data');
if (bron) {
  const { naam: NAAM, schema, stappen: STAPPEN, stapnaam: STAP = 'Stap', reeks: REEKS } = JSON.parse(bron.textContent);
  const hier = location.pathname.split('/').pop() || 'index.html';
  const svg = document.querySelector(`${schema} svg`);
  const stijl = document.createElement('style');
  stijl.textContent = `
    body.met-paneel nldd-shell { margin-left: min(600px, 92vw); width: calc(100vw - min(600px, 92vw)) !important; max-width: calc(100vw - min(600px, 92vw)); }
    body.met-paneel .canvas > svg { min-width: 0; }
    ${schema} [data-stap] { cursor: pointer; }
    ${schema} svg * { transition: opacity 0.4s ease; }
    ${schema} svg.pres-dim [data-stap]:not(.pres-licht) { opacity: 0.2; }
    ${schema} text[data-stap]:focus-visible { outline: 2px solid #ffbf00; outline-offset: 2px; }
    .att-kaart-scherm { display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid #e3e6ea; }
    @media (prefers-reduced-motion: reduce) { ${schema} svg * { transition: none; } }
    #att-overlay {
      position: fixed; top: 0; bottom: 0; left: 0; z-index: 2147483001; box-sizing: border-box;
      width: min(600px, 92vw); display: flex; flex-direction: column;
      background: #154273; color: #fff; box-shadow: 0 0 24px rgb(0 0 0 / 0.35);
      font-family: "RijksSans", system-ui, sans-serif; animation: att-in 0.25s ease both;
    }
    #att-overlay[hidden] { display: none; }
    #att-overlay:focus { outline: none; }
    @keyframes att-in { from { transform: translateX(-24px); opacity: 0; } }
    .att-inhoud { flex: 1; overflow: auto; padding: 32px 32px 24px; }
    .att-label { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: rgb(255 255 255 / 0.85); }
    .att-titel { margin: 0 0 16px; font-size: 32px; line-height: 1.15; font-weight: 600; }
    .att-titel span { display: block; color: #ffb612; font-size: 0.75em; }
    .att-lead { margin: 0 0 16px; font-size: 18px; line-height: 1.5; }
    .att-punten { margin: 0 0 20px; padding-left: 1.2em; font-size: 16px; line-height: 1.5; }
    .att-punten li { margin-bottom: 8px; }
    .att-punten strong { color: #ffb612; }
    .att-tekst { margin: 0 0 12px; font-size: 16px; line-height: 1.5; }
    .att-scheiding { margin: 0 0 20px; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.3); }
    /* Soort stap en soort kaart: attestatie tonen, uitgeven, of een verzoek zonder attestatie */
    .att-soort { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin: 0 0 16px; padding: 6px 14px; border-radius: 999px; background: #fff; font-size: 14px; color: #5b6573; }
    .att-soort strong { color: var(--soort-kleur); }
    [data-soort="tonen"], [data-soort="vraag"] { --soort-kleur: #2d7a46; }
    [data-soort="uitgifte"] { --soort-kleur: #1f5fa8; }
    [data-soort="verzoek"] { --soort-kleur: #5b6573; }
    [data-soort="sessie"] { --soort-kleur: #0e7c86; }
    [data-soort="doorgeven"] { --soort-kleur: #7a4f8c; }
    .att-kaart[data-soort] { border-left: 6px solid var(--soort-kleur); }
    .att-kaart[data-soort="verzoek"], .att-kaart[data-soort="sessie"], .att-kaart[data-soort="vraag"] { background: #f4f6f8; border-left-style: dashed; }
    .att-kaart-label { margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--soort-kleur, #5b6573); }
    .att-kaart { margin: 0 0 20px; padding: 16px 20px; background: #fff; color: #1a1a2e; border-radius: 12px; }
    .att-kaart-kop { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e3e6ea; }
    .att-kaart-kop strong { font-size: 17px; }
    .att-kaart-kop span { font-size: 12px; color: #5b6573; text-align: right; }
    .att-velden { margin: 0; display: grid; gap: 10px; }
    .att-velden div { padding-bottom: 10px; border-bottom: 1px solid #f0f2f4; }
    .att-velden div:last-child { border-bottom: none; padding-bottom: 0; }
    .att-velden dt { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12px; color: #5b6573; overflow-wrap: anywhere; }
    .att-velden dd { margin: 2px 0 0; font-size: 16px; font-weight: 700; overflow-wrap: anywhere; }
    .att-velden dd small { display: block; margin-top: 2px; font-size: 13px; font-weight: 400; color: #5b6573; }
    #att-overlay .att-inhoud a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
    #att-overlay .att-inhoud a:hover { color: #ffb612; }
    #att-overlay .att-inhoud a:focus-visible { outline: 2px solid #ffb612; outline-offset: 2px; }
    .att-kop { margin: 24px 0 8px; font-size: 18px; line-height: 1.3; font-weight: 700; color: #ffb612; }
    .att-kop:first-child { margin-top: 0; }
    .att-bron { margin: 0; font-size: 13px; line-height: 1.5; color: rgb(255 255 255 / 0.8); }
    .att-voet { display: flex; align-items: center; gap: 16px; padding: 16px 32px; border-top: 1px solid rgb(255 255 255 / 0.25); font-size: 13px; color: rgb(255 255 255 / 0.8); }
    .att-voet button { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.5); background: transparent; color: #fff; font: inherit; font-size: 18px; cursor: pointer; }
    .att-voet button:hover { background: rgb(255 255 255 / 0.15); }
    .att-voet button:focus-visible { outline: 2px solid #ffb612; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { #att-overlay { animation: none; } }
    /* Overzicht van alle presentaties in een reeks (slide 0), gelijk aan het EBW-landschap */
    .att-balk { padding: 16px 32px 0; }
    .att-overzicht { font: inherit; font-size: 14px; color: #fff; background: transparent; border: 1px solid rgb(255 255 255 / 0.45); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
    .att-overzicht:hover { background: rgb(255 255 255 / 0.15); }
    .att-overzicht:focus-visible { outline: 2px solid #ffb612; outline-offset: 2px; }
    #pres-keuze {
      --pres-pad: clamp(24px, 3.5vw, 72px);
      position: fixed; inset: 0; z-index: 2147483002; box-sizing: border-box; overflow: auto;
      display: flex; flex-direction: column; justify-content: center; gap: clamp(24px, 4vh, 48px);
      padding: var(--pres-pad); color: #fff; font-family: "RijksSans", system-ui, sans-serif;
      background: radial-gradient(120% 140% at 0% 0%, #1d4f86 0%, #1a3a66 48%, #172b4f 100%);
    }
    #pres-keuze[hidden] { display: none; }
    #pres-keuze:focus { outline: none; }
    #pres-keuze .pres-titel { margin: 0; font-size: clamp(36px, min(4.4vw, 7.5vh), 92px); line-height: 1.04; font-weight: 700; letter-spacing: -0.01em; }
    #pres-keuze .pres-titel span { display: block; color: #ffb612; }
    @keyframes pres-in { from { opacity: 0; transform: translateY(8px); } }
    .keuze-opties { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: clamp(16px, 2vw, 32px); max-width: 1400px; }
    .keuze-opties button {
      display: flex; flex-direction: column; gap: 12px; text-align: left; font: inherit; color: #fff; cursor: pointer;
      padding: clamp(20px, 2.5vw, 40px); background: rgb(255 255 255 / 0.08); border: 1px solid rgb(255 255 255 / 0.3);
      border-radius: 16px; animation: pres-in 0.6s ease both;
    }
    .keuze-opties button + button { animation-delay: 0.1s; }
    .keuze-opties button:hover { background: rgb(255 255 255 / 0.16); }
    .keuze-opties button:focus-visible { outline: 3px solid #ffb612; outline-offset: 3px; }
    .keuze-opties button[aria-current] { border-color: #ffb612; }
    .keuze-nr { color: #ffb612; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; font-size: clamp(12px, 1vw, 16px); }
    .keuze-naam { font-size: clamp(22px, min(2vw, 3.6vh), 36px); font-weight: 700; line-height: 1.1; }
    .keuze-uitleg { font-size: clamp(15px, min(1.1vw, 2vh), 20px); line-height: 1.45; color: rgb(255 255 255 / 0.85); }
    .keuze-voet { display: flex; align-items: center; gap: 16px; font-size: 14px; color: rgb(255 255 255 / 0.7); }
    .keuze-voet button { font: inherit; color: #fff; background: rgb(255 255 255 / 0.12); border: 1px solid rgb(255 255 255 / 0.3); border-radius: 8px; padding: 4px 12px; cursor: pointer; }
    @media (prefers-reduced-motion: reduce) { .keuze-opties button { animation: none; } }
`;
  document.head.append(stijl);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Tekst in het paneel mag **vet** en [links](pagina.html of https://...) bevatten; de rest blijft platte tekst
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|[\w-]+\.html)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  let paneel, huidig = 0, terugFocus;
  const bouw = () => {
    paneel = document.createElement('aside');
    paneel.id = 'att-overlay'; paneel.hidden = true; paneel.tabIndex = -1;
    paneel.setAttribute('aria-label', `Presentatie: ${NAAM}`);
    paneel.innerHTML = `${REEKS ? '<div class="att-balk"><button type="button" class="att-overzicht" data-overzicht>&#8592; Alle presentaties</button></div>' : ''}<div class="att-inhoud" aria-live="polite"></div>
      <div class="att-voet">
        <button type="button" data-att-close aria-label="Presentatie sluiten (Esc)">&times;</button>
        <span class="att-teller"></span>
        <span>&#8592; &#8594; bladeren · Esc sluit</span>
        <span class="att-nav"><button type="button" data-richting="-1" aria-label="Vorige">&#8592;</button><button type="button" data-richting="1" aria-label="Volgende">&#8594;</button></span>
      </div>`;
    document.body.append(paneel);
    paneel.addEventListener('click', (e) => {
      const k = e.target.closest('button'); if (!k) return;
      if (k.hasAttribute('data-att-close')) return sluit();
      if (k.hasAttribute('data-overzicht')) return openKeuze();
      naar(huidig + Number(k.dataset.richting));
    });
  };
  // Een kaart mag een soort hebben (verzoek: gestippeld grijs, zoals op het EBW-landschap) en een eigen randkleur
  const kaart = (k) => `<div class="att-kaart"${k.soort ? ` data-soort="${esc(k.soort)}"` : ''}${k.kleur && k.soort !== 'verzoek' ? ` style="--soort-kleur:${esc(k.kleur)}"` : ''}>
      ${k.label ? `<p class="att-kaart-label">${esc(k.label)}</p>` : ''}
      <div class="att-kaart-kop"><strong>${esc(k.titel)}</strong><span>${esc(k.bij || '')}</span></div>
      ${k.img ? `<img class="att-kaart-scherm" src="${k.img}" alt="${esc(k.alt)}">` : ''}
      ${k.rijen?.length ? `<dl class="att-velden">${k.rijen.map(([veld, waarde, uitleg]) => `
        <div><dt>${esc(veld)}</dt><dd>${esc(waarde)}${uitleg ? `<small>${esc(uitleg)}</small>` : ''}</dd></div>`).join('')}</dl>` : ''}
    </div>`;
  const toon = () => {
    const s = STAPPEN[huidig];
    const sub = (t) => `<ul>${t.map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
    // Een punt mag ook [tekst, [subpunten]] zijn, bijvoorbeeld voor oplossingsrichtingen
    // Een punt dat alleen uit vette tekst bestaat (**Kop**) is een tussenkop: die staat boven de lijst, niet erin
    const isKop = (p) => typeof p === 'string' && /^\*\*[^*]+\*\*$/.test(p.trim());
    const items = [...(s.punten || []).map((p) => (isKop(p) ? { kop: p.trim().slice(2, -2) }
      : Array.isArray(p) ? `<li>${md(p[0])}${sub(p[1])}</li>` : `<li>${md(p)}</li>`)),
      ...(s.aannames || []).map((a) => `<li><strong>Aanname.</strong> ${md(a)}</li>`),
      // Een toelichting mag ook een lijst zijn: dan als subpunten (bijvoorbeeld twee losse problemen)
      ...(s.vragen || []).map(([v, q, t]) => `<li><strong>Open vraag ${esc(v)}.</strong> ${md(q)} ${Array.isArray(t) ? sub(t) : md(t)}</li>`)];
    let punten = '', open = [];
    const sluitLijst = () => { if (open.length) punten += `<ul class="att-punten">${open.join('')}</ul>`; open = []; };
    items.forEach((x) => { if (x.kop) { sluitLijst(); punten += `<h3 class="att-kop">${md(x.kop)}</h3>`; } else open.push(x); });
    sluitLijst();
    const inhoud = paneel.querySelector('.att-inhoud');
    inhoud.innerHTML = `
      <p class="att-label">${esc(NAAM)} · ${esc(STAP)} ${esc(s.n)}${(s.kenmerken || []).map((k) => ` · ${esc(k)}`).join('')}</p>
      <h2 class="att-titel">${esc(STAP)} ${esc(s.n)} <span>${esc(s.kop)}</span></h2>
      ${s.soort ? `<p class="att-soort" style="--soort-kleur:${s.soort[2]}"><strong>${esc(s.soort[0])}</strong><span>${esc(s.soort[1])}</span></p>` : ''}
      <p class="att-lead">${md(s.lead)}</p>
      ${s.opties ? `${s.opties.tekst ? `<p class="att-tekst">${esc(s.opties.tekst)}</p>` : ''}<ul class="att-punten">${s.opties.items.map(([l, t, z]) => `<li><strong>${esc(l)}:</strong> ${esc(t)}${z && z.length ? sub(z) : ''}</li>`).join('')}</ul>${punten ? '<hr class="att-scheiding">' : ''}` : ''}
      ${punten}
      ${(s.kaarten || []).map(kaart).join('')}
      ${s.bron ? `<p class="att-bron">${md(s.bron).replace(/^Voorbeeldwaarden zijn fictief\./, '<em>$&</em>')}</p>` : ''}`;
    inhoud.scrollTop = 0;
    paneel.querySelector('.att-teller').textContent = `${huidig + 1} / ${STAPPEN.length}`;
    const [vorige, volgende] = paneel.querySelectorAll('[data-richting]');
    // In een reeks gaat terug vanaf de eerste stap naar het overzicht
    vorige.disabled = huidig === 0 && !REEKS; volgende.disabled = huidig === STAPPEN.length - 1;
    if (REEKS) history.replaceState(null, '', `${location.pathname}?presentatie#/${huidig}`);
    svg.classList.add('pres-dim');
    svg.querySelectorAll('.pres-licht').forEach((el) => el.classList.remove('pres-licht'));
    const doel = svg.querySelectorAll(`[data-stap="${s.n}"]`);
    doel.forEach((el) => el.classList.add('pres-licht'));
    // Scrollen na de herindeling van de pagina; vangnet als soepel scrollen wordt onderbroken (zoals op het EBW-landschap)
    const el = doel[0];
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
      setTimeout(() => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' }); }, 800);
    }
  };
  const naar = (i) => {
    if (i < 0 && REEKS) return openKeuze();
    huidig = Math.max(0, Math.min(STAPPEN.length - 1, i)); toon();
  };
  const open = (i) => {
    if (!paneel) bouw();
    if (paneel.hidden) terugFocus = document.activeElement;
    paneel.hidden = false; document.body.classList.add('met-paneel'); naar(i); paneel.focus({ preventScroll: true });
  };
  const sluit = () => {
    if (!paneel || paneel.hidden) return;
    paneel.hidden = true; document.body.classList.remove('met-paneel');
    svg.classList.remove('pres-dim'); svg.querySelectorAll('.pres-licht').forEach((el) => el.classList.remove('pres-licht'));
    if (REEKS) history.replaceState(null, '', location.pathname);
    terugFocus?.focus?.({ preventScroll: true });
  };
  // Slide 0: overzicht van alle presentaties in de reeks; een andere presentatie opent op zijn eigen pagina
  let keuze, keuzeFocus;
  const items = REEKS?.items || [];
  const openKeuze = () => {
    if (!REEKS) return;
    if (paneel && !paneel.hidden) sluit();
    if (!keuze) {
      keuze = document.createElement('div');
      keuze.id = 'pres-keuze'; keuze.tabIndex = -1;
      keuze.setAttribute('role', 'dialog'); keuze.setAttribute('aria-modal', 'true'); keuze.setAttribute('aria-label', 'Kies een presentatie');
      keuze.innerHTML = `
        <h2 class="pres-titel">${esc(REEKS.titel)} <span>${esc(REEKS.sub)}</span></h2>
        <div class="keuze-opties">${items.map((x, i) => `
          <button type="button" data-kies="${i}"${x.href === hier ? ' aria-current="page"' : ''}>
            <span class="keuze-nr">Presentatie ${i + 1} · ${esc(x.soort)} · ${x.stappen} ${x.stappen === 1 ? 'slide' : 'slides'}</span>
            <span class="keuze-naam">${esc(x.naam)}</span>
            <span class="keuze-uitleg">${esc(x.uitleg)}</span>
          </button>`).join('')}
        </div>
        <div class="keuze-voet"><button type="button" data-sluit>Sluiten</button><span>Kies met 1 tot en met ${items.length} · Esc sluit</span></div>`;
      document.body.append(keuze);
      keuze.addEventListener('click', (e) => {
        const k = e.target.closest('button'); if (!k) return;
        if (k.hasAttribute('data-sluit')) return sluitKeuze();
        kies(Number(k.dataset.kies));
      });
    }
    if (keuze.hidden !== false) keuzeFocus = document.activeElement;
    keuze.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    history.replaceState(null, '', `${location.pathname}?presentatie`);
    (keuze.querySelector('[aria-current]') || keuze.querySelector('[data-kies]')).focus();
  };
  const sluitKeuze = (terug = true) => {
    if (!keuze || keuze.hidden) return;
    keuze.hidden = true;
    document.documentElement.style.overflow = '';
    if (terug) { history.replaceState(null, '', location.pathname); keuzeFocus?.focus?.({ preventScroll: true }); }
  };
  const kies = (i) => {
    const x = items[i]; if (!x) return;
    if (x.href === hier) { sluitKeuze(false); open(0); }
    else location.href = x.href.includes('?') ? `${x.href}#/0` : `${x.href}?presentatie#/0`;
  };
  const index = (n) => STAPPEN.findIndex((s) => String(s.n) === String(n));
  svg.querySelectorAll('circle[data-stap] + text[data-stap]').forEach((t) => { t.setAttribute('tabindex', '0'); t.setAttribute('role', 'button'); t.setAttribute('aria-label', `${STAP} ${t.dataset.stap} openen`); });
  svg.addEventListener('click', (e) => {
    if (e.altKey) return; // Option/Alt + klik is voor opmerkingen
    const el = e.target.closest?.('[data-stap]');
    if (el) open(index(el.dataset.stap));
  });
  document.getElementById('presenteer-stappen')?.addEventListener('click', () => open(0));
  // Shift+P opent de presentatie (en sluit hem weer), zoals op het EBW-landschap; niet tijdens typen
  const inInvoer = (e) => e.composedPath().some((x) => x instanceof HTMLElement && (x.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName)));
  window.addEventListener('keydown', (e) => {
    // Het overzicht (slide 0): kies met een cijfer, Esc sluit, Tab blijft binnen het overzicht
    if (keuze && !keuze.hidden && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const nr = Number(e.key);
      if (nr >= 1 && nr <= items.length) { e.preventDefault(); e.stopImmediatePropagation(); kies(nr - 1); }
      else if (e.key === 'Escape' || (e.shiftKey && e.code === 'KeyP')) { e.preventDefault(); e.stopImmediatePropagation(); sluitKeuze(); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const knoppen = [...keuze.querySelectorAll('button')], i = knoppen.indexOf(document.activeElement);
        knoppen[(i + (e.shiftKey ? -1 : 1) + knoppen.length) % knoppen.length].focus();
      }
      return;
    }
    if (e.shiftKey && e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.altKey && !inInvoer(e)) {
      e.preventDefault(); e.stopImmediatePropagation();
      return paneel && !paneel.hidden ? sluit() : open(0);
    }
    const el = e.target instanceof Element && e.target.dataset?.stap && e.target.closest(schema) ? e.target : null;
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(index(el.dataset.stap)); return; }
    if (!paneel || paneel.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const acties = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
    if (e.key in acties) { e.preventDefault(); naar(huidig + acties[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); naar(0); }
    else if (e.key === 'End') { e.preventDefault(); naar(STAPPEN.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); sluit(); }
  }, true);
  // Direct openen via de link: ?presentatie toont het overzicht, ?presentatie#/n deze presentatie op stap n
  if (REEKS && new URLSearchParams(location.search).has('presentatie')) {
    const m = location.hash.match(/^#\/(\d+)/);
    const start = () => (m ? open(Math.min(Number(m[1]), STAPPEN.length - 1)) : openKeuze());
    document.readyState === 'complete' ? start() : window.addEventListener('load', start, { once: true });
  }
}
