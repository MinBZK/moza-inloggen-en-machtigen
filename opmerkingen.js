// Opmerkingen op de pagina's van de roadmap (behalve index.html, die heeft een eigen variant met verdieping).
// Werkt met server.py (achter SSO Rijk); zonder server (statische versie) blijft alles uit.
// Option/Alt + klik ergens op de pagina plaatst een opmerking op die plek. Anker:
// 'pagina:<bestand>|plek|<selector>|x|y'. Open opmerkingen staan als oranje markering op hun plek;
// de knop 'Opmerkingen' (in de footer) toont alle open en opgeloste opmerkingen van deze pagina.
// Plaatshouders in de pagina: #opm-hint (uitleg) en #opm-knop (knop naar het overzicht).

const PAGE = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
const PREFIX = `pagina:${PAGE}|`;
let OPMERKINGEN = [];
let IK = null;
let AAN = false;
let signature = '';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
const oneLine = (t) => String(t).replace(/\s+/g, ' ').trim();
const api = async (path, body) => {
  const res = await fetch(`api/${path}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'roadmap' }, body: JSON.stringify(body) }
    : { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.fout || `Er ging iets mis (${res.status})`);
  return data;
};

// Markeringen: zelfde vorm als op de roadmap (zeer opvallend oranje, pulserend)
const style = document.createElement('style');
style.textContent = `
  [data-opm-host] { position: relative; }
  [data-opm-pin] { position: absolute; z-index: 4; transform: translate(-50%, -50%); border-radius: 50%;
    color: var(--primitives-color-oranje-500, #e17000);
    box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--primitives-color-oranje-500, #e17000);
    animation: opm-pulse 1.6s ease-out infinite; }
  @keyframes opm-pulse {
    0% { box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--primitives-color-oranje-500, #e17000), 0 0 0 6px rgb(225 112 0 / .6); }
    100% { box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--primitives-color-oranje-500, #e17000), 0 0 0 18px transparent; }
  }
  @media (prefers-reduced-motion: reduce) { [data-opm-pin] { animation: none; } }`;
document.head.append(style);

// Onderdelen: veld (popover), overzicht (sheet), uitleg en knop
const root = document.querySelector('nldd-page') || document.body;
root.insertAdjacentHTML('beforeend', `
  <span id="opm-anchor" hidden></span>
  <nldd-popover id="opm-popover" anchor="opm-anchor" accessible-label="Opmerking plaatsen" width="360px">
    <nldd-container padding="16" gap="12" id="opm-popover-body"></nldd-container>
  </nldd-popover>
  <nldd-sheet id="opm-sheet" width="560px" accessible-label="Opmerkingen op deze pagina">
    <nldd-container padding="24" gap="16" id="opm-sheet-body"></nldd-container>
  </nldd-sheet>`);
const popover = document.getElementById('opm-popover');
const popoverBody = document.getElementById('opm-popover-body');
const sheet = document.getElementById('opm-sheet');
const sheetBody = document.getElementById('opm-sheet-body');
const isSheetOpen = () => Boolean(sheet.shadowRoot?.querySelector('dialog')?.open);

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const HINT_KEY = 'roadmap-opmerkingen-hint-weg';
const hintDismissed = () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } };
const hintHost = document.getElementById('opm-hint');
const buttonHost = document.getElementById('opm-knop');
const renderChrome = () => {
  if (hintHost) {
    hintHost.innerHTML = AAN && !hintDismissed() ? `
      <nldd-spacer size="16"></nldd-spacer>
      <nldd-banner variant="neutral" icon="message-rectangle-text" heading-level="2" dismissible
        text="Opmerkingen plaatsen" supporting-text="${esc(`${isMac ? 'Option (⌥)' : 'Alt'} + klik ergens op de pagina opent een opmerkingenveld. Je naam komt uit je rijksaccount.`)}"></nldd-banner>` : '';
    hintHost.querySelector('nldd-banner')?.addEventListener('dismiss', () => {
      hintHost.innerHTML = '';
      try { localStorage.setItem(HINT_KEY, '1'); } catch { /* geen opslag: hint komt bij herladen terug */ }
    });
  }
  if (buttonHost) {
    const open = OPMERKINGEN.filter((o) => o.status === 'open').length;
    const done = OPMERKINGEN.length - open;
    buttonHost.innerHTML = AAN ? `<nldd-button id="opm-open" variant="neutral-tinted" size="sm" start-icon="message-rectangle-text"
      text="${esc(`Opmerkingen op deze pagina (${open} open, ${done} opgelost)`)}"></nldd-button>` : '';
    buttonHost.querySelector('#opm-open')?.addEventListener('click', () => { renderSheet(); sheet.show(); });
  }
};

// Draadje: opmerking, reacties en conclusie
const row = (icon, color, overline, text, textColor = 'default') => `
  <nldd-list-item>
    <nldd-spacer-cell slot="start" size="12"></nldd-spacer-cell>
    <nldd-icon-cell slot="start" icon="${icon}" color="${color}" size="16" vertical-alignment="top"></nldd-icon-cell>
    <nldd-spacer-cell slot="start" size="8"></nldd-spacer-cell>
    <nldd-text-cell size="sm" color="${textColor}" overline="${esc(overline)}" text="${esc(text)}"></nldd-text-cell>
  </nldd-list-item>`;
const threadRows = (o) => {
  const done = o.status === 'opgelost';
  return [
    row(done ? 'check-mark-circle' : 'message-rectangle-text', done ? 'success' : 'accent', `${o.auteur} · ${fmtDate(o.datum)}`, oneLine(o.opmerking), done ? 'secondary' : 'default'),
    ...o.reacties.map((c) => row('arrow-u-turn-forward', 'secondary', `${c.auteur} · ${fmtDate(c.datum)}`, oneLine(c.tekst), done ? 'secondary' : 'default')),
    done ? row('check-mark', 'success', `Opgelost door ${o.opgelost_door || 'een editor'}`, `Conclusie: ${oneLine(o.conclusie)}`, 'success') : '',
  ].join('');
};
const actionButtons = (o) => [
  `<nldd-button data-opm-reply="${o.nummer}" variant="neutral-transparent" size="xs" start-icon="arrow-u-turn-forward" text="Reageren"></nldd-button>`,
  IK?.editor && o.status === 'open' ? `<nldd-button data-opm-resolve="${o.nummer}" variant="neutral-transparent" size="xs" start-icon="check-mark" text="Oplossen"></nldd-button>` : '',
  IK?.editor && o.status === 'opgelost' ? `<nldd-button data-opm-reopen="${o.nummer}" variant="neutral-transparent" size="xs" start-icon="arrow-2-counter-clockwise" text="Heropenen"></nldd-button>` : '',
  o.status === 'open' && hostOfAnchor(o.anker) ? `<nldd-button data-opm-show="${o.nummer}" variant="neutral-transparent" size="xs" end-icon="chevron-right" text="Toon op de pagina"></nldd-button>` : '',
].filter(Boolean).join('');
const threadBlock = (o) => `
  <nldd-list variant="box">${threadRows(o)}
    <nldd-list-item>
      <nldd-spacer-cell slot="start" size="12"></nldd-spacer-cell>
      <nldd-cell><nldd-container layout="wrap" gap="4">${actionButtons(o)}</nldd-container></nldd-cell>
    </nldd-list-item>
  </nldd-list>`;

// Overzicht van deze pagina: eerst open, dan opgelost (nieuwste eerst)
function renderSheet() {
  const open = OPMERKINGEN.filter((o) => o.status === 'open').sort((a, b) => b.datum.localeCompare(a.datum));
  const done = OPMERKINGEN.filter((o) => o.status === 'opgelost').sort((a, b) => (b.opgelost_op || b.datum).localeCompare(a.opgelost_op || a.datum));
  const group = (list) => list.map((o) => `
    <nldd-title size="6"><span slot="overline">${esc(o.onderdeel)}</span></nldd-title>${threadBlock(o)}`).join('');
  sheetBody.innerHTML = `
    <nldd-title size="3">
      <span slot="overline">${esc(document.title)}</span>
      <h2>Opmerkingen op deze pagina</h2>
      <p slot="subtitle">${esc(`${isMac ? 'Option (⌥)' : 'Alt'} + klik ergens op de pagina plaatst een nieuwe opmerking.`)}</p>
      <nldd-icon-button slot="actions" icon="dismiss" variant="neutral-transparent" text="Sluiten" data-opm-close></nldd-icon-button>
    </nldd-title>
    <nldd-title size="5"><h3>Open (${open.length})</h3></nldd-title>
    ${open.length ? group(open) : '<nldd-inline-dialog icon="message-rectangle-text" text="Geen open opmerkingen"></nldd-inline-dialog>'}
    <nldd-title size="5"><h3>Opgelost (${done.length})</h3></nldd-title>
    ${done.length ? group(done) : '<nldd-inline-dialog icon="file-box" text="Nog geen opgeloste opmerkingen" supporting-text="Een opmerking komt hier zodra een editor hem oplost met een conclusie."></nldd-inline-dialog>'}`;
}

// Plek op de pagina: dichtstbijzijnde HTML-element met id (geen SVG, geen cel), anders de eerste sectie
const HOST_TAGS = new Set(['DIV', 'SECTION', 'HEADER', 'FOOTER', 'MAIN', 'ARTICLE', 'NLDD-SIMPLE-SECTION', 'NLDD-CARD', 'NLDD-BOX']);
const fallbackHost = () => document.querySelector('nldd-simple-section[id], .wrap, nldd-simple-section');
const selectorOf = (el) => (el.id ? `#${CSS.escape(el.id)}` : (el.matches('.wrap') ? '.wrap' : 'nldd-simple-section'));
const hostOfAnchor = (anker) => {
  const sel = anker.slice(PREFIX.length).split('|')[1];
  try { return sel ? document.querySelector(sel) : null; } catch { return null; }
};
const describeTarget = (path, e) => {
  const host = path.find((el) => el instanceof HTMLElement && el.id && !el.id.startsWith('opm-') && HOST_TAGS.has(el.tagName)) || fallbackHost();
  const rect = host.getBoundingClientRect();
  const pct = (v) => Math.round(v * 1000) / 10;
  const hint = oneLine(path.find((el) => el.textContent?.trim() && el.textContent.trim().length < 200)?.textContent || '').slice(0, 80);
  const heading = host.querySelector('h1, h2, h3, svg > title') || path.find((el) => el.querySelector?.('h1, h2'))?.querySelector('h1, h2');
  const section = oneLine(heading?.textContent || '');
  const step = /^#(moza|subsidie)-\d+$/.test(location.hash) ? ` (${location.hash.slice(1)})` : '';
  const label = [document.title + step, section].filter(Boolean).join(' · ');
  return {
    anker: `${PREFIX}plek|${selectorOf(host)}|${pct((e.clientX - rect.left) / rect.width)}|${pct((e.clientY - rect.top) / rect.height)}`,
    onderdeel: hint ? `${label}: "${hint}"` : label,
  };
};

const showPopoverAt = (x, y) => {
  // Een open overzicht is modaal: het veld moet daarbinnen staan om bedienbaar te zijn
  const parent = isSheetOpen() ? sheet : root;
  if (popover.parentElement !== parent) { if (popover.matches(':popover-open')) popover.hidePopover(); parent.append(popover); }
  popover.setAttribute('left', `${Math.max(8, Math.min(x + 12, innerWidth - 368))}px`);
  popover.setAttribute('top', `${Math.max(8, Math.min(y + 12, innerHeight - 320))}px`);
  if (!popover.matches(':popover-open')) popover.showPopover();
};
const openForm = (point, { label, overline = '', title, subtitle, field, submitText, note, send }) => {
  popover.setAttribute('accessible-label', label);
  popoverBody.innerHTML = `
    <nldd-title size="6">${overline ? `<span slot="overline">${esc(overline)}</span>` : ''}<h2>${esc(title)}</h2><p slot="subtitle">${esc(subtitle)}</p></nldd-title>
    <nldd-form-field label="${esc(field)}"><nldd-multi-line-text-field id="opm-text" rows="4" autofocus></nldd-multi-line-text-field></nldd-form-field>
    <nldd-container layout="wrap" gap="8">
      <nldd-button id="opm-submit" variant="primary" size="sm" text="${esc(submitText)}"></nldd-button>
      <nldd-button id="opm-cancel" variant="neutral-tinted" size="sm" text="Annuleren"></nldd-button>
    </nldd-container>
    <nldd-title size="6"><p slot="subtitle" id="opm-note">${esc(note)}</p></nldd-title>`;
  const textField = popoverBody.querySelector('#opm-text');
  const submit = popoverBody.querySelector('#opm-submit');
  submit.addEventListener('click', async () => {
    const text = (textField.value || '').trim();
    if (!text) { textField.setAttribute('invalid', ''); return; }
    submit.setAttribute('disabled', '');
    try {
      await send(text);
      popover.hidePopover();
      signature = '';
      await load();
    } catch (err) {
      popoverBody.querySelector('#opm-note').textContent = err.message;
      submit.removeAttribute('disabled');
    }
  });
  popoverBody.querySelector('#opm-cancel').addEventListener('click', () => popover.hidePopover());
  showPopoverAt(point.x, point.y);
};
const openPinThread = (o, point) => {
  popover.setAttribute('accessible-label', `Opmerking #${o.nummer}`);
  popoverBody.innerHTML = `
    <nldd-title size="6"><span slot="overline">${esc(o.onderdeel)}</span><h2>Opmerking van ${esc(o.auteur)}</h2></nldd-title>
    ${threadBlock(o)}`;
  showPopoverAt(point.x, point.y);
};

const renderPins = () => {
  document.querySelectorAll('[data-opm-pin]').forEach((el) => el.remove());
  OPMERKINGEN.filter((o) => o.status === 'open').forEach((o) => {
    const [, , x, y] = o.anker.slice(PREFIX.length).split('|');
    const host = hostOfAnchor(o.anker);
    if (!host) return;
    host.setAttribute('data-opm-host', '');
    host.insertAdjacentHTML('beforeend', `<nldd-icon-button data-opm-pin="${o.nummer}" size="sm" style="left:${parseFloat(x)}%;top:${parseFloat(y)}%"
      variant="inherit-filled" icon="message-rectangle-text" text="Opmerking van ${esc(o.auteur)}"></nldd-icon-button>`);
  });
};

async function load() {
  try {
    if (!IK) {
      const me = await api('ik');
      IK = me.gebruiker;
      AAN = Boolean(me.opmerkingen && me.gebruiker);
    }
    if (!AAN) return;
    const data = ((await api('opmerkingen')).opmerkingen || []).filter((o) => o.anker.startsWith(PREFIX));
    const sig = JSON.stringify(data);
    if (sig === signature) return;
    signature = sig;
    OPMERKINGEN = data;
    renderPins();
    renderChrome();
    if (isSheetOpen()) renderSheet();
  } catch (err) {
    if (AAN) console.warn('Opmerkingen verversen mislukt:', err);
  }
}

// Klikken: Option/Alt + klik plaatst een opmerking; knoppen in draadjes en markeringen
document.addEventListener('click', async (e) => {
  if (!AAN) return;
  const path = e.composedPath().filter((el) => el instanceof Element);
  if (e.altKey) {
    // Capture-fase: geen link volgen of download starten
    e.preventDefault();
    e.stopPropagation();
    if (path.includes(popover)) return;
    const target = describeTarget(path, e);
    openForm({ x: e.clientX, y: e.clientY }, {
      label: 'Opmerking plaatsen', title: 'Opmerking plaatsen', subtitle: target.onderdeel,
      field: 'Opmerking', submitText: 'Plaatsen', note: `Wordt geplaatst als ${IK?.naam || 'jou'}.`,
      send: (text) => api('opmerkingen', { anker: target.anker, onderdeel: target.onderdeel, opmerking: text }),
    });
    return;
  }
  if (path.some((el) => el.hasAttribute('data-opm-close'))) { sheet.hide(); return; }
  const pin = path.find((el) => el.dataset?.opmPin);
  const btn = path.find((el) => el.dataset?.opmReply || el.dataset?.opmResolve || el.dataset?.opmReopen || el.dataset?.opmShow);
  if (!pin && !btn) return;
  e.stopPropagation();
  const id = pin ? pin.dataset.opmPin : (btn.dataset.opmReply || btn.dataset.opmResolve || btn.dataset.opmReopen || btn.dataset.opmShow);
  const o = OPMERKINGEN.find((x) => String(x.nummer) === id);
  if (!o) return;
  if (pin) { openPinThread(o, { x: e.clientX, y: e.clientY }); return; }
  const rect = btn.getBoundingClientRect();
  const point = { x: rect.left, y: rect.bottom };
  if (btn.dataset.opmReply) {
    openForm(point, { label: 'Reageren', overline: o.onderdeel, title: 'Reageren', subtitle: oneLine(o.opmerking).slice(0, 140), field: 'Reactie',
      submitText: 'Reactie plaatsen', note: `Wordt toegevoegd aan deze opmerking als ${IK?.naam || 'jou'}.`,
      send: (text) => api(`opmerkingen/${o.nummer}/reacties`, { tekst: text }) });
  } else if (btn.dataset.opmResolve) {
    openForm(point, { label: 'Oplossen', overline: o.onderdeel, title: 'Opmerking oplossen', subtitle: oneLine(o.opmerking).slice(0, 140), field: 'Conclusie',
      submitText: 'Oplossen', note: 'De conclusie verschijnt bij het draadje; heropenen kan altijd.',
      send: (text) => api(`opmerkingen/${o.nummer}/oplossen`, { conclusie: text }) });
  } else if (btn.dataset.opmShow) {
    sheet.hide();
    popover.matches(':popover-open') && popover.hidePopover();
    const marker = document.querySelector(`[data-opm-pin="${o.nummer}"]`);
    marker?.scrollIntoView({ block: 'center' });
    marker?.focus?.();
  } else {
    btn.setAttribute('disabled', '');
    try { await api(`opmerkingen/${o.nummer}/heropenen`, {}); popover.hidePopover(); signature = ''; await load(); }
    catch { btn.removeAttribute('disabled'); }
  }
}, true);

load();
setInterval(() => { if (!document.hidden && !popover.matches(':popover-open')) load(); }, 30000);
