import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const tag = process.argv[2];
const b = await chromium.launch();
for (const [name, url] of [['home',''],['cs','projects/classroom-signal/'],['rp','projects/reach-planner/']]) for (const w of [1280, 375]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
  await p.goto('http://localhost:8123/' + url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const svgs = await p.$$eval('svg', s => s.map(x => x.outerHTML).join('\n'));
  writeFileSync('/tmp/claude-0/-home-user-AlkaliMiu-github-io/b7efb8bb-3e97-5c90-9da9-6b64a5aa7df9/scratchpad/svgdiff/' + tag + '-' + name + '-' + w + '.svg', svgs); await ctx.close();
}
await b.close();
