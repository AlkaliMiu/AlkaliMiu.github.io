// Home page card images: one 960 x 600 WebP per tool, in light (card.webp) and dark (card-dark.webp),
// taken from the pages themselves so they stay in step with the tools.
// It serves the site itself, so no other server is needed.
//
// Usage: npm install, then npm run cards
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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
const W = 960, H = 600;

const browser = await chromium.launch();

// Draws PNG shots onto one canvas and returns WebP bytes. Each part is { png, x, y, w, h, sx, sy, sw, sh, border }.
async function compose(bg, parts) {
  const page = await browser.newPage();
  const data = await page.evaluate(async ({ W, H, bg, parts }) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (const p of parts) {
      const img = new Image(); img.src = 'data:image/png;base64,' + p.png; await img.decode();
      g.drawImage(img, p.sx ?? 0, p.sy ?? 0, p.sw ?? img.width, p.sh ?? img.height, p.x, p.y, p.w, p.h);
      if (p.border) { g.strokeStyle = p.border; g.lineWidth = 2; g.strokeRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2); }
    }
    return c.toDataURL('image/webp', 0.82).split(',')[1];
  }, { W, H, bg, parts });
  await page.close();
  return Buffer.from(data, 'base64');
}
const b64 = (buf) => buf.toString('base64');
// An element shot scaled to the card width and cut to the card height from the top
const fit = (png, width) => ({ png: b64(png), x: 0, y: 0, w: W, h: H, sx: 0, sy: 0, sw: width, sh: width * H / W });

for (const scheme of ['light', 'dark']) {
  const suffix = scheme === 'dark' ? '-dark' : '';
  const ctx = (opts) => browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce', ...opts });
  const tokens = async (page) => page.evaluate(() => { const s = getComputedStyle(document.documentElement); return { paper: s.getPropertyValue('--paper').trim(), ink: s.getPropertyValue('--ink').trim() }; });
  const fresh = async (page, path) => { await page.goto(BASE + path); await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle' }); await page.mouse.move(0, 0); };

  // Classroom Signal: the top of the dashboard at a small laptop width
  let c = await ctx({ viewport: { width: W, height: H } }); let p = await c.newPage();
  await fresh(p, 'projects/classroom-signal/');
  let png = await p.screenshot();
  await writeFile(join(root, `projects/classroom-signal/card${suffix}.webp`), await compose('#000', [{ png: b64(png), x: 0, y: 0, w: W, h: H }]));
  await c.close();

  // Signal Setup: three screens of the prototype side by side, as a phone shows them
  c = await ctx({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); p = await c.newPage();
  await fresh(p, 'projects/signal-setup/');
  await p.addStyleTag({ content: '.strip{display:none}' });
  const { paper, ink } = await tokens(p);
  const parts = [];
  for (const [i, screen] of ['school', 'phone', 'result'].entries()) {
    await p.selectOption('#jump', screen); await p.click('#jump-go'); await p.waitForTimeout(150);
    if (screen === 'phone') await p.fill('#phone-in', '0712 345 678').catch(() => {});
    await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    parts.push({ png: b64(await p.screenshot()), x: 45 + i * 300, y: 44, w: 258, h: 516, border: ink });
  }
  await writeFile(join(root, `projects/signal-setup/card${suffix}.webp`), await compose(paper, parts));
  await c.close();

  // Reach Planner: the planning map with its layers
  c = await ctx({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); p = await c.newPage();
  await fresh(p, 'projects/reach-planner/');
  const box = p.locator('#mapbox');
  png = await box.screenshot();
  const rw = (await box.boundingBox()).width * 2;
  await writeFile(join(root, `projects/reach-planner/card${suffix}.webp`), await compose('#000', [fit(png, rw)]));
  await c.close();

  // Fine Print: the first offer with its receipt
  c = await ctx({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); p = await c.newPage();
  await fresh(p, 'projects/fine-print/');
  const offer = p.locator('#offer-A');
  png = await offer.screenshot();
  await writeFile(join(root, `projects/fine-print/card${suffix}.webp`), await compose('#000', [fit(png, (await offer.boundingBox()).width * 2)]));
  await c.close();
  console.log(`${scheme}: 4 cards written`);
}
await browser.close();
server.close();
