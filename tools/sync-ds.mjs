// Copies the shared CSS into every HTML page, so each page stays one self-contained file.
//
// A page opts in by putting markers inside a <style> element:
//   /* ds:start */ ... /* ds:end */      design-system/ds.css   (tokens and components, every page)
//   /* site:start */ ... /* site:end */  design-system/site.css (page shell and long-form text, portfolio pages)
// Everything between a pair of markers is replaced with the current source file.
//
// Usage:
//   node tools/sync-ds.mjs           update every page
//   node tools/sync-ds.mjs --check   change nothing; exit with code 1 if a page is out of date
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sources = { ds: 'design-system/ds.css', site: 'design-system/site.css' };
const check = process.argv.includes('--check');

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

// The source keeps its comments; pages get a compact copy without comments or indentation.
function compact(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

let stale = 0;
for (const file of htmlFiles(root)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [name, source] of Object.entries(sources)) {
    const sourcePath = join(root, source);
    if (!existsSync(sourcePath)) continue;
    const css = compact(readFileSync(sourcePath, 'utf8'));
    const block = new RegExp(`/\\* ${name}:start[^*]*\\*/[\\s\\S]*?/\\* ${name}:end \\*/`, 'g');
    // A function replacement, so "$" in the CSS is never read as a pattern.
    after = after.replace(block, () =>
      `/* ${name}:start: copied from /${source} by tools/sync-ds.mjs. Edit that file, not this copy. */\n${css}\n/* ${name}:end */`);
  }
  if (after === before) continue;
  stale++;
  const path = relative(root, file);
  if (check) console.log(`out of date: ${path}`);
  else { writeFileSync(file, after); console.log(`updated: ${path}`); }
}
if (!stale) console.log('All pages are up to date.');
if (check && stale) process.exit(1);
