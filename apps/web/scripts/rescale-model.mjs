/**
 * Redimensiona um GLB para tamanho real (metros) e gera GLB + USDZ.
 * Uso: node scripts/rescale-model.mjs public/models/burger.glb 0.20
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

const inputRel = process.argv[2];
const targetMeters = Number(process.argv[3] || '0.2');
if (!inputRel || !Number.isFinite(targetMeters) || targetMeters <= 0) {
  console.error('Uso: node scripts/rescale-model.mjs <arquivo.glb> <metros>');
  process.exit(1);
}

const inputPath = path.resolve(webRoot, inputRel);
const glbOut = inputPath;
const usdzOut = inputPath.replace(/\.glb$/i, '.usdz');
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
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

window.__process = async (url, target) => {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const factor = target / maxDim;
  root.scale.multiplyScalar(factor);
  root.updateMatrixWorld(true);

  // recentrar na origem / chão
  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box2.min.y;
  root.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(root);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  const glbAb = await new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      root,
      (result) => resolve(result),
      (err) => reject(err),
      { binary: true },
    );
  });

  const usdzAb = await new USDZExporter().parseAsync(root);

  const toB64 = (ab) => {
    const bytes = new Uint8Array(ab);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  return {
    glb: toB64(glbAb),
    usdz: toB64(usdzAb),
    before: maxDim,
    after: Math.max(finalSize.x, finalSize.y, finalSize.z),
    factor,
  };
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
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[page]', msg.text());
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const result = await page.evaluate(
    async (name, target) => window.__process(`/${name}`, target),
    glbName,
    targetMeters,
  );

  fs.writeFileSync(glbOut, Buffer.from(result.glb, 'base64'));
  fs.writeFileSync(usdzOut, Buffer.from(result.usdz, 'base64'));
  console.log(
    `OK ${path.basename(inputPath)}: ${result.before.toFixed(3)}m → ${result.after.toFixed(3)}m (x${result.factor.toFixed(4)})`,
  );
} finally {
  await browser.close();
  server.close();
}
