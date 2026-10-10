// Accessibility audit: runs axe-core on every page in many states, in light and dark themes,
// at phone and desktop widths, in English and French, and on every screen of the Signal Setup prototype.
// It serves the site itself, so no other server is needed.
//
// Usage: npm install, then npm run audit
// Exits with code 1 if axe reports any violation.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const results = [];
async function audit(page, label) {
  await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async (tags) => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  }, TAGS);
  results.push({ label, violations });
  if (violations.length) {
    console.log(`\n${label}`);
    for (const v of violations) console.log(`  ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.join('\n    ')}`);
  }
}

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  for (const [width, height, mobile] of [[375, 800, true], [1280, 900, false]]) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const tag = `${scheme}, ${width} px:`;

    for (const path of ['', 'design-system/', 'projects/classroom-signal/case-study.html', 'projects/signal-setup/case-study.html']) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await audit(page, `${tag} /${path}`);
    }

    // Classroom Signal: the states a district officer moves through
    await page.goto(BASE + 'projects/classroom-signal/');
    await audit(page, `${tag} dashboard`);
    await page.click('#lang-fr'); await audit(page, `${tag} dashboard in French`); await page.click('#lang-en');
    await page.click('.row >> nth=0'); await audit(page, `${tag} dashboard, offline school details`);
    await page.click('.backbtn'); await page.click('.row >> nth=40'); await page.click('details summary');
    await audit(page, `${tag} dashboard, school details with daily table`);
    await page.keyboard.press('Escape');
    await page.selectOption('#f-district', 'ruvazi'); await page.waitForTimeout(600); await audit(page, `${tag} dashboard, one district`);
    await page.fill('#q', 'zzzz'); await audit(page, `${tag} dashboard, empty search`); await page.fill('#q', '');
    if (mobile) { await page.click('#view-map'); await audit(page, `${tag} dashboard, map view`); }

    // Signal Setup: every screen, through the reviewer panel, in both languages
    await page.goto(BASE + 'projects/signal-setup/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + 'projects/signal-setup/#welcome'); await page.reload();
    const screens = await page.$$eval('#jump option', (options) => options.map((o) => o.value));
    for (const lang of ['en', 'fr']) {
      await page.click('#lang-' + lang);
      for (const screen of screens) {
        await page.selectOption('#jump', screen); await page.click('#jump-go'); await page.waitForTimeout(100);
        await audit(page, `${tag} prototype ${lang}, ${screen}`);
      }
    }
    await page.click('#lang-en');
    await page.selectOption('#jump', 'type'); await page.click('#jump-go'); await page.click('button[form="codeform"]');
    await audit(page, `${tag} prototype, code error`);
    await page.selectOption('#jump', 'light'); await page.click('#jump-go'); await page.click('[data-act="retry"]');
    await audit(page, `${tag} prototype, light check error`);
    await page.click('input[name="light"][value="off"]'); await audit(page, `${tag} prototype, light check fix`);
    await context.close();
  }
}
await browser.close();
server.close();

const failing = results.filter((r) => r.violations.length);
console.log(`\naxe-core checked ${results.length} states: ${failing.length ? failing.length + ' with violations' : 'no violations'}.`);
process.exit(failing.length ? 1 : 0);
