// Stappenpresentatie: één gedeelde opbouw voor alle stappenschema's op de roadmap-site, gelijk aan de
// presentaties op het EBW-landschap (ebw-landschap.html?presentatie=flow). Paneel links, de pagina schuift
// op, de actieve stap blijft op kleur en de andere stappen dimmen tot 20%.
//
// Gebruik in een pagina:
//   - een knop  <nldd-button id="presenteer-stappen" appearance="neutral-tinted" size="sm"
//                 start-icon="desk-with-screen" text="Presenteer de stappen (Shift+P)"></nldd-button>
//   - een schema <div class="canvas" id="..."><svg> met data-stap="n" op alle onderdelen van een stap
//   - de gegevens als JSON in een script-element van het type application/json met id="stappen-data":
//     { "naam": ..., "schema": "#id", "stappen": [...] }
//   - dit bestand als module-script (src="stappen-presentatie.js"); build.py bakt het in
// Een stap: { n, kop, kenmerken: [..], soort: [naam, uitleg, kleur], lead, punten: [tekst of [tekst, [subpunten]]], aannames: [..],
//             vragen: [[V1, vraag, toelichting of [subpunten]]], kaarten: [{ label, titel, bij, img, alt, rijen: [[veld, waarde, uitleg]] }], bron }

const bron = document.getElementById('stappen-data');
if (bron) {
  const { naam: NAAM, schema, stappen: STAPPEN } = JSON.parse(bron.textContent);
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
    .att-bron { margin: 0; font-size: 13px; line-height: 1.5; color: rgb(255 255 255 / 0.8); }
    .att-voet { display: flex; align-items: center; gap: 16px; padding: 16px 32px; border-top: 1px solid rgb(255 255 255 / 0.25); font-size: 13px; color: rgb(255 255 255 / 0.8); }
    .att-voet button { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.5); background: transparent; color: #fff; font: inherit; font-size: 18px; cursor: pointer; }
    .att-voet button:hover { background: rgb(255 255 255 / 0.15); }
    .att-voet button:focus-visible { outline: 2px solid #ffb612; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { #att-overlay { animation: none; } }
`;
  document.head.append(stijl);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let paneel, huidig = 0, terugFocus;
  const bouw = () => {
    paneel = document.createElement('aside');
    paneel.id = 'att-overlay'; paneel.hidden = true; paneel.tabIndex = -1;
    paneel.setAttribute('aria-label', `Presentatie: ${NAAM}`);
    paneel.innerHTML = `<div class="att-inhoud" aria-live="polite"></div>
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
      naar(huidig + Number(k.dataset.richting));
    });
  };
  const kaart = (k) => `<div class="att-kaart">
      ${k.label ? `<p class="att-kaart-label">${esc(k.label)}</p>` : ''}
      <div class="att-kaart-kop"><strong>${esc(k.titel)}</strong><span>${esc(k.bij || '')}</span></div>
      ${k.img ? `<img class="att-kaart-scherm" src="${k.img}" alt="${esc(k.alt)}">` : ''}
      ${k.rijen?.length ? `<dl class="att-velden">${k.rijen.map(([veld, waarde, uitleg]) => `
        <div><dt>${esc(veld)}</dt><dd>${esc(waarde)}${uitleg ? `<small>${esc(uitleg)}</small>` : ''}</dd></div>`).join('')}</dl>` : ''}
    </div>`;
  const toon = () => {
    const s = STAPPEN[huidig];
    const sub = (t) => `<ul>${t.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    // Een punt mag ook [tekst, [subpunten]] zijn, bijvoorbeeld voor oplossingsrichtingen
    const punten = [...(s.punten || []).map((p) => (Array.isArray(p) ? `<li>${esc(p[0])}${sub(p[1])}</li>` : `<li>${esc(p)}</li>`)),
      ...(s.aannames || []).map((a) => `<li><strong>Aanname.</strong> ${esc(a)}</li>`),
      // Een toelichting mag ook een lijst zijn: dan als subpunten (bijvoorbeeld twee losse problemen)
      ...(s.vragen || []).map(([v, q, t]) => `<li><strong>Open vraag ${esc(v)}.</strong> ${esc(q)} ${Array.isArray(t) ? sub(t) : esc(t)}</li>`)].join('');
    const inhoud = paneel.querySelector('.att-inhoud');
    inhoud.innerHTML = `
      <p class="att-label">${esc(NAAM)} · Stap ${esc(s.n)}${(s.kenmerken || []).map((k) => ` · ${esc(k)}`).join('')}</p>
      <h2 class="att-titel">Stap ${esc(s.n)} <span>${esc(s.kop)}</span></h2>
      ${s.soort ? `<p class="att-soort" style="--soort-kleur:${s.soort[2]}"><strong>${esc(s.soort[0])}</strong><span>${esc(s.soort[1])}</span></p>` : ''}
      <p class="att-lead">${esc(s.lead)}</p>
      ${punten ? `<ul class="att-punten">${punten}</ul>` : ''}
      ${(s.kaarten || []).map(kaart).join('')}
      ${s.bron ? `<p class="att-bron">${esc(s.bron)}</p>` : ''}`;
    inhoud.scrollTop = 0;
    paneel.querySelector('.att-teller').textContent = `${huidig + 1} / ${STAPPEN.length}`;
    const [vorige, volgende] = paneel.querySelectorAll('[data-richting]');
    vorige.disabled = huidig === 0; volgende.disabled = huidig === STAPPEN.length - 1;
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
  const naar = (i) => { huidig = Math.max(0, Math.min(STAPPEN.length - 1, i)); toon(); };
  const open = (i) => {
    if (!paneel) bouw();
    if (paneel.hidden) terugFocus = document.activeElement;
    paneel.hidden = false; document.body.classList.add('met-paneel'); naar(i); paneel.focus({ preventScroll: true });
  };
  const sluit = () => {
    if (!paneel || paneel.hidden) return;
    paneel.hidden = true; document.body.classList.remove('met-paneel');
    svg.classList.remove('pres-dim'); svg.querySelectorAll('.pres-licht').forEach((el) => el.classList.remove('pres-licht'));
    terugFocus?.focus?.({ preventScroll: true });
  };
  const index = (n) => STAPPEN.findIndex((s) => String(s.n) === String(n));
  svg.querySelectorAll('circle[data-stap] + text[data-stap]').forEach((t) => { t.setAttribute('tabindex', '0'); t.setAttribute('role', 'button'); t.setAttribute('aria-label', `Gegevens bij stap ${t.dataset.stap}`); });
  svg.addEventListener('click', (e) => {
    if (e.altKey) return; // Option/Alt + klik is voor opmerkingen
    const el = e.target.closest?.('[data-stap]');
    if (el) open(index(el.dataset.stap));
  });
  document.getElementById('presenteer-stappen')?.addEventListener('click', () => open(0));
  // Shift+P opent de presentatie (en sluit hem weer), zoals op het EBW-landschap; niet tijdens typen
  const inInvoer = (e) => e.composedPath().some((x) => x instanceof HTMLElement && (x.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName)));
  window.addEventListener('keydown', (e) => {
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
}
