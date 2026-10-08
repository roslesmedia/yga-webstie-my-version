// Builds yga_website_v5.html from yga/v5/src.html.
// Tailwind is compiled ahead of time (no in-browser CDN compiler) and the minified
// CSS is inlined into the page, so the site ships one small stylesheet and zero
// framework JavaScript.
// Run: `node tools/build-v5.mjs` (needs network the first time, for npx).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'yga/v5');
const outCss = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yga-v5-')), 'tw.css');

execFileSync('npx', ['-y', 'tailwindcss@3.4.17',
  '-c', path.join(dir, 'tailwind.config.js'),
  '-i', path.join(dir, 'input.css'),
  '-o', outCss, '--minify'], { cwd: root, stdio: 'inherit' });

const css = fs.readFileSync(outCss, 'utf8').trim();
const src = fs.readFileSync(path.join(dir, 'src.html'), 'utf8');
const marker = '<!-- TAILWIND_CSS -->';
if (src.split(marker).length !== 2) throw new Error('expected exactly one ' + marker + ' in src.html');

const html = src.replace(marker, () => `<style>${css}</style>`);
fs.writeFileSync(path.join(root, 'yga_website_v5.html'), html);
console.log(`yga_website_v5.html written (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, CSS ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB)`);
