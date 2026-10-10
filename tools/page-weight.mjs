// Prints the size of every HTML page, raw and gzipped (what a browser downloads from GitHub Pages).
// Pages that state their own size declare it as: const PAGE={kb:'57',gz:'18'};
// With --check, the script exits with code 1 when a declared size no longer matches the file.
//
// Usage: node tools/page-weight.mjs [--check]
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

let mismatches = 0;
for (const file of htmlFiles(root)) {
  const bytes = readFileSync(file);
  const kb = Math.round(bytes.length / 1024);
  const gz = Math.round(gzipSync(bytes, { level: 9 }).length / 1024);
  let note = '';
  const declared = bytes.toString('utf8').match(/const PAGE=\{kb:'(\d+)',gz:'(\d+)'\}/);
  if (declared) {
    const ok = Number(declared[1]) === kb && Number(declared[2]) === gz;
    if (!ok) mismatches++;
    note = ok ? '  (matches the size stated on the page)' : `  MISMATCH: the page says ${declared[1]} KB / ${declared[2]} KB`;
  }
  console.log(`${relative(root, file).padEnd(44)} ${String(kb).padStart(4)} KB  ${String(gz).padStart(3)} KB gzipped${note}`);
}
if (check && mismatches) process.exit(1);
