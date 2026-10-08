// Assembles src/* into the single deployable index.html at repo root.
// Run locally: `node tools/build.mjs`. Vercel never runs this; it serves the committed index.html.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => { const p = path.join(root, 'src', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : ''; };

const head = read('head.html');
const css = [read('styles.css'), read('motion.css')].filter(Boolean).join('\n');
const body = read('body.html');
const motion = read('motion.js');
const scene = read('scene.js');

const html = `<!doctype html>
<html lang="en">
<head>
${head}
<style>
${css}
</style>
</head>
<body>
${body}
${motion ? `<script>\n${motion}\n</script>` : ''}
${scene ? `<script type="module">\n${scene}\n</script>` : ''}
</body>
</html>
`;
// The homepage is now the upgraded YGA site (tools/build-yga.mjs); this older build writes beside it.
fs.mkdirSync(path.join(root, 'old-site'), { recursive: true });
fs.writeFileSync(path.join(root, 'old-site/index.html'), html);
console.log(`old-site/index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB (head ${head.length}, css ${css.length}, body ${body.length}, motion ${motion.length}, scene ${scene.length} chars)`);
