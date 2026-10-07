// Builds yga/index.html from the client's original bundle (yga/source/YGA.original.html)
// by applying the targeted patches and injecting the upgrade layer (fonts, CSS, motion JS).
// Run: `node tools/build-yga.mjs`. Fails if any patch no longer matches exactly once.
import fs from 'node:fs';
import path from 'node:path';
import { scenePatches, motionPatches } from '../yga/source/patches.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = p => path.join(root, 'yga/source', p);
let html = fs.readFileSync(src('YGA.original.html'), 'utf8');

const copyFile = src('copy-patches.json');
const copyPatches = fs.existsSync(copyFile) ? JSON.parse(fs.readFileSync(copyFile, 'utf8')) : [];

let failed = 0;
for (const [group, list] of [['scene', scenePatches], ['motion', motionPatches], ['copy', copyPatches]]) {
  for (const { find, replace } of list) {
    const count = html.split(find).length - 1;
    if (count !== 1) {
      console.error(`[${group}] expected 1 match, found ${count}: ${find.slice(0, 90)}`);
      failed++;
      continue;
    }
    html = html.replace(find, () => replace);
  }
}
if (failed) process.exit(1);

const font = f => fs.readFileSync(src(`fonts/${f}`)).toString('base64');
const fonts = `@font-face{font-family:"Cormorant Garamond";font-style:normal;font-weight:300 700;font-display:swap;src:url(data:font/woff2;base64,${font('corm.woff2')}) format("woff2")}
@font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:300 700;font-display:swap;src:url(data:font/woff2;base64,${font('corm-i.woff2')}) format("woff2")}
@font-face{font-family:"Jost";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font('jost.woff2')}) format("woff2")}`;

const css = fs.readFileSync(src('upgrade.css'), 'utf8');
const js = fs.readFileSync(src('upgrade.js'), 'utf8');

const license = `<!-- Embedded font licenses: Cormorant Garamond (Copyright 2015 The Cormorant Project Authors) and Jost (Copyright 2020 The Jost Project Authors), both under the SIL Open Font License 1.1, http://scripts.sil.org/OFL -->\n`;
const meta = `<meta property="og:title" content="YGA — Young Growth Agency">
<meta property="og:description" content="We turn your audience into real digital products and revenue streams — you stay the face, we handle the rest.">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
`;

const insertOnce = (needle, text, after = true) => {
  const i = needle === '</body>' ? html.lastIndexOf(needle) : html.indexOf(needle);
  if (i < 0) { console.error(`missing anchor ${needle}`); process.exit(1); }
  html = after ? html.slice(0, i + needle.length) + text + html.slice(i + needle.length) : html.slice(0, i) + text + html.slice(i);
};
insertOnce('<head>', '\n' + license + meta, true);
insertOnce('</head>', `<style id="yga-upgrade">\n${fonts}\n${css}\n</style>\n`, false);
insertOnce('</body>', `<script id="yga-motion">\n${js}\n</script>\n`, false);

const out = path.join(root, 'yga/index.html');
fs.writeFileSync(out, html);
console.log(`yga/index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB · patches: scene ${scenePatches.length}, motion ${motionPatches.length}, copy ${copyPatches.length}`);
