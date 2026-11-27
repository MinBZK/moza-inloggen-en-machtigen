// Legt een bronscherm vast als schermafbeelding en geeft de hotspots (in % van de afbeelding) van alle
// elementen met data-keuze. Gebruik (met de lokale server op poort 8905 aan):
//   NODE_PATH=<map met playwright> node schermen/bron/vastleggen.mjs moza-inloggen-voor-wie platform-inloggen-voor-wie
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const [bron, doel] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25, colorScheme: 'light' });
await page.goto(`http://localhost:8905/schermen/bron/${bron.includes('.html') ? bron : bron + '.html'}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// Zo hoog als de inhoud: tot onder de footer (niet langer, anders blijft er wit over)
const hoogte = await page.evaluate(() => Math.ceil(document.querySelector('nldd-page-footer')?.getBoundingClientRect().bottom || 800));
await page.setViewportSize({ width: 1280, height: Math.min(hoogte, 1000) });
await page.waitForTimeout(300);
const maat = page.viewportSize();
const vlakken = await page.$$eval('[data-keuze]', (els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { keuze: el.dataset.keuze, x: r.x, y: r.y, b: r.width, h: r.height };
}));
await page.screenshot({ path: `schermen/${doel}.png` });
const pct = (v, t) => Math.round((v / t) * 1000) / 10;
console.log(JSON.stringify(vlakken.map((v) => ({ keuze: v.keuze, x: pct(v.x, maat.width), y: pct(v.y, maat.height), b: pct(v.b, maat.width), h: pct(v.h, maat.height) }))));
await browser.close();
