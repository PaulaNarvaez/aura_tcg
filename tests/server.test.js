import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/index.js';

const product = {
  id: 'published-card', name: 'Carta publicada', category: 'cards', price: 12990,
  stock: 2, image: null, badge: null, tone: 'yellow', description: 'Ficha de prueba.',
};

async function serve(t, options = {}) {
  const server = createServer(createApp(options));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function staticFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pokenova-http-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await writeFile(join(distDir, 'index.html'), '<!doctype html><html><body>Pokénova de prueba</body></html>');
  await writeFile(join(distDir, 'assets', 'app.js'), 'console.log("archivo público");');
  await writeFile(join(distDir, 'assets', 'style.css'), 'body { color: green; }');
  await writeFile(join(root, 'private.txt'), 'PRIVATE_DATABASE_PASSWORD_FOR_TEST');
  let symlinkCreated = true;
  try {
    await symlink(join(root, 'private.txt'), join(distDir, 'leak.txt'));
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    symlinkCreated = false;
  }
  return { root, distDir, symlinkCreated };
}

function rawGet(base, path) {
  const target = new URL(base);
  return new Promise((resolve, reject) => {
    const req = request({ hostname: target.hostname, port: target.port, path, method: 'GET' }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('public catalog returns JSON without browser database credentials or cache reuse', async t => {
  const base = await serve(t, { readProducts: async () => [product] });
  const response = await fetch(`${base}/api/products`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await response.json(), [product]);
});

test('catalog accepts only GET and has no public write endpoint', async t => {
  let reads = 0;
  const base = await serve(t, { readProducts: async () => { reads += 1; return [product]; } });
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
    const response = await fetch(`${base}/api/products`, { method });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('allow'), 'GET', method);
    await response.text();
  }
  assert.equal(reads, 0);
});

test('database errors return a generic unavailable response without SQL or credentials', async t => {
  const detail = 'SELECT password FROM private_table; postgresql://admin:SECRET_PASSWORD@db.neon.tech/shop';
  const base = await serve(t, { readProducts: async () => { throw new Error(detail); } });
  const response = await fetch(`${base}/api/products`);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { error: 'No pudimos cargar el catálogo.' });
  assert.doesNotMatch(body, /SELECT|private_table|SECRET_PASSWORD|postgresql|neon\.tech/);
});

test('unknown API routes remain JSON 404 responses rather than receiving the React page', async t => {
  const { distDir } = await staticFixture(t);
  const base = await serve(t, { readProducts: async () => [], distDir });
  const response = await fetch(`${base}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.doesNotMatch(await response.text(), /<!doctype|Pokénova de prueba/);
});

test('production files support GET and HEAD with their browser MIME types', async t => {
  const { distDir } = await staticFixture(t);
  const base = await serve(t, { readProducts: async () => [], distDir });
  const index = await fetch(base);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  assert.match(await index.text(), /Pokénova de prueba/);
  const script = await fetch(`${base}/assets/app.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /(?:application|text)\/javascript/);
  assert.equal(await script.text(), 'console.log("archivo público");');
  const stylesheet = await fetch(`${base}/assets/style.css`, { method: 'HEAD' });
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /text\/css/);
  assert.equal(await stylesheet.text(), '');
  const denied = await fetch(base, { method: 'POST' });
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get('allow'), 'GET, HEAD');
});

test('encoded paths and symlinks cannot expose files outside the production directory', async t => {
  const { distDir, symlinkCreated } = await staticFixture(t);
  const base = await serve(t, { readProducts: async () => [], distDir });
  const paths = ['/../private.txt', '/%2e%2e/private.txt', '/assets/%2e%2e/%2e%2e/private.txt', '/assets%2f..%2f..%2fprivate.txt', '/..%5cprivate.txt', '/%00', '/%', '/server/index.js', '/missing.png'];
  if (symlinkCreated) paths.push('/leak.txt');
  else t.diagnostic('Windows no permite crear el enlace simbólico; se mantienen todas las comprobaciones de rutas.');
  for (const path of paths) {
    const response = await rawGet(base, path);
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(response.body, /PRIVATE_DATABASE_PASSWORD_FOR_TEST/, path);
  }
});

test('an absent build directory does not break the API or return a misleading HTML success', async t => {
  const { root } = await staticFixture(t);
  const base = await serve(t, { readProducts: async () => [], distDir: join(root, 'not-built') });
  const catalog = await fetch(`${base}/api/products`);
  assert.equal(catalog.status, 200);
  assert.deepEqual(await catalog.json(), []);
  const index = await fetch(base);
  assert.equal(index.status, 404);
});
