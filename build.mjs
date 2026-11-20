import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false
});

const jsCode = result.outputFiles[0].text;
const template = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');

const safeJs = jsCode.replace(/<\/script>/gi, '<\\/script>');
const finalHtml = template.replace(
  '<!-- BUNDLE_SCRIPT_PLACEHOLDER -->',
  () => `<script>\n${safeJs}\n</script>`
);

const outPath = path.join(root, 'index.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log(`Built 雪見堂 single-file HTML: ${outPath} (${(finalHtml.length / 1024).toFixed(1)} KB)`);
