// Builds a preview copy of the site for hosts that supply their own document skeleton.
// Usage: node tools/build-preview.mjs <out.html>. The deployable index.html is untouched.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8').trim();
const head = read('head.html');
const keep = head.split('\n').filter(l => /<title>|<script>|fonts\.g/.test(l)).join('\n').replace(/<title>[^<]*<\/title>/, '<title>Your Growth Agency</title>');
const out = process.argv[2] || path.join(root, 'preview.html');
const html = `${keep}
<style>
${read('styles.css')}
${read('motion.css')}
</style>
${read('body.html')}
<script>
${read('motion.js')}
</script>
<script type="module">
${read('scene.js')}
</script>
`;
fs.writeFileSync(out, html);
console.log(`${out} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
