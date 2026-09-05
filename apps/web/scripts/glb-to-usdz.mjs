/**
 * Converte GLB → USDZ (Three.js USDZExporter + Puppeteer).
 * Uso: node scripts/glb-to-usdz.mjs public/models/burger.glb
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

const inputRel = process.argv[2];
if (!inputRel) {
  console.error('Uso: node scripts/glb-to-usdz.mjs <arquivo.glb>');
  process.exit(1);
}

const inputPath = path.resolve(webRoot, inputRel);
const outputPath = inputPath.replace(/\.glb$/i, '.usdz');
const glbName = path.basename(inputPath);

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
<script type="module">
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

window.__convert = async (url) => {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const exporter = new USDZExporter();
  const ab = await exporter.parseAsync(gltf.scene);
  const bytes = new Uint8Array(ab);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};
window.__ready = true;
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  if (req.url === `/${glbName}`) {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(fs.readFileSync(inputPath));
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const resultB64 = await page.evaluate(async (name) => {
    return window.__convert(`/${name}`);
  }, glbName);

  fs.writeFileSync(outputPath, Buffer.from(resultB64, 'base64'));
  console.log(`OK → ${path.relative(webRoot, outputPath)} (${fs.statSync(outputPath).size} bytes)`);
} finally {
  await browser.close();
  server.close();
}
