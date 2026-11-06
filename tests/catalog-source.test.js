import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCatalogConfig, imageUrl, loadProducts, validateCatalogApiUrl } from '../src/catalog-source.js';

const url = '/api/products';
const row = { id: 'caja-1', name: 'Caja para cartas', category: 'accessories', price: 12990, stock: 2, image: null };
const response = (data, options) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, ...options });

test('only a nonempty public catalog API setting enables live inventory', () => {
  assert.equal(hasCatalogConfig(), false);
  assert.equal(hasCatalogConfig({ VITE_CATALOG_API_URL: '  ' }), false);
  assert.equal(hasCatalogConfig({ VITE_CATALOG_API_URL: url }), true);
  assert.equal(hasCatalogConfig({ DATABASE_URL: 'private server setting' }), false);
});

test('catalog endpoints accept same-origin absolute paths and HTTPS without credentials or query strings', async () => {
  for (const value of ['/api/products', '/pokenova/api/products', 'https://shop.example.com/api/products']) {
    assert.equal(validateCatalogApiUrl(` ${value} `), value);
  }
  for (const value of [
    undefined, '', 'api/products', '//shop.example.com/api/products',
    '/api/../products', '/api/%2e%2e/products', '/api/%252e%252e/products',
    '/api\\products', '/api/products?token=private', '/api/products#fragment',
    'http://shop.example.com/api/products', 'postgresql://user:private@database.example.com/db',
    'https://user:private@shop.example.com/api/products', 'https://shop.example.com/api/../products',
    'https://shop.example.com/api/products?token=private', 'https://shop.example.com/api/products#fragment',
  ]) {
    assert.throws(() => validateCatalogApiUrl(value), error => {
      assert.equal(error.message, 'Revisa la dirección de la API del catálogo.');
      return true;
    });
    await assert.rejects(loadProducts({ url: value, fetchImpl: () => assert.fail('Invalid URL must not reach the network') }), /dirección de la API/);
  }
});

test('GET uses the configured API without authentication or database credentials and normalizes products', async () => {
  const items = await loadProducts({ url, fetchImpl: async (input, init) => {
    assert.equal(input, url);
    assert.equal(init.method, 'GET');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers, undefined);
    assert.equal(init.body, undefined);
    return response([
      row,
      { ...row, id: 'carta', category: 'cards', image: 'https://cdn.example.com/carta.png', price: 0, stock: 0, badge: ' Nuevo ', tone: 'yellow', description: 'Una carta.' },
      { ...row, id: 'caja-local', image: '/images/caja.jpg', tone: 'unknown' },
    ]);
  } });
  assert.deepEqual(items, [
    { ...row, categoryLabel: 'Accesorios', tone: 'mint', description: '' },
    { id: 'carta', name: row.name, category: 'cards', categoryLabel: 'Cartas', price: 0, stock: 0, image: 'https://cdn.example.com/carta.png', badge: 'Nuevo', tone: 'yellow', description: 'Una carta.' },
    { ...row, id: 'caja-local', image: '/images/caja.jpg', categoryLabel: 'Accesorios', tone: 'mint', description: '' },
  ]);
});

test('an empty response is a valid empty catalog and returned product order is preserved', async () => {
  assert.deepEqual(await loadProducts({ url, fetchImpl: async () => response([]) }), []);
  const items = await loadProducts({ url, fetchImpl: async () => response([{ ...row, id: 'second' }, { ...row, id: 'first' }]) });
  assert.deepEqual(items.map(({ id }) => id), ['second', 'first']);
});

test('retired plush rows from an older API stay hidden without blocking active products', async () => {
  const retired = { ...row, id: 'legacy-plush', category: 'plush' };
  const malformedRetired = { id: 'legacy-draft', category: 'plush', price: 'outdated' };
  const items = await loadProducts({ url, fetchImpl: async () => response([
    retired, row, malformedRetired, { ...row, id: 'active-card', category: 'cards' },
  ]) });
  assert.deepEqual(items.map(({ id }) => id), [row.id, 'active-card']);
  assert.deepEqual(await loadProducts({ url, fetchImpl: async () => response([retired, malformedRetired]) }), []);
  await assert.rejects(loadProducts({ url, fetchImpl: async () => response([retired, { ...row, category: 'unknown' }]) }), /No pudimos cargar/);
});

test('invalid products and duplicate ids reject the entire catalog rather than showing partial inventory', async () => {
  for (const invalid of [
    null, [], { ...row, id: '' }, { ...row, name: ' ' }, { ...row, category: 'all' },
    { ...row, price: -1 }, { ...row, price: 12.5 }, { ...row, price: '1000' },
    { ...row, stock: -1 }, { ...row, stock: 1.1 }, { ...row, stock: Number.MAX_SAFE_INTEGER + 1 },
    { ...row, image: '/private/caja.jpg' }, { ...row, image: '/images/../private.jpg' },
    { ...row, image: 'http://cdn.example.com/a.jpg' }, { ...row, image: '//cdn.example.com/a.jpg' },
    { ...row, image: 'javascript:alert(1)' }, { ...row, image: '' },
    { ...row, description: 12 }, { ...row, badge: [] },
  ]) {
    await assert.rejects(loadProducts({ url, fetchImpl: async () => response([invalid]) }), /No pudimos cargar/);
  }
  await assert.rejects(loadProducts({ url, fetchImpl: async () => response([row, row]) }), /No pudimos cargar/);
});

test('network, HTTP, invalid JSON and backend payloads produce a generic error without backend details', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('private network detail'); },
    async () => response({ message: 'private backend detail' }, { status: 403 }),
    async () => new Response('not json'),
    async () => response({ message: 'private backend detail' }),
  ]) {
    await assert.rejects(loadProducts({ url, fetchImpl }), error => {
      assert.equal(error.message, 'No pudimos cargar el catálogo. Inténtalo nuevamente.');
      return true;
    });
  }
});

test('aborting prevents requests or propagates cancellation during an in-flight request', async () => {
  const before = new AbortController();
  before.abort();
  await assert.rejects(loadProducts({ url, signal: before.signal, fetchImpl: () => assert.fail('Already aborted') }), { name: 'AbortError' });
  const during = new AbortController();
  await assert.rejects(loadProducts({ url, signal: during.signal, fetchImpl: async (_, init) => {
    assert.equal(init.signal, during.signal);
    during.abort();
    throw during.signal.reason;
  } }), { name: 'AbortError' });
});

test('image URLs preserve remote HTTPS and resolve repository files under a Pages subpath', () => {
  assert.equal(imageUrl('/images/caja.png', '/pokenova_tcg/'), '/pokenova_tcg/images/caja.png');
  assert.equal(imageUrl('images/caja.png'), '/images/caja.png');
  assert.equal(imageUrl('/favicon.svg?version=2', '/pokenova_tcg/'), '/pokenova_tcg/favicon.svg?version=2');
  assert.equal(imageUrl('https://cdn.example.com/caja.png?width=400', '/pokenova_tcg/'), 'https://cdn.example.com/caja.png?width=400');
  for (const path of [null, '', 'javascript:alert(1)', 'http://cdn.example.com/a.jpg', '//cdn.example.com/a.jpg', '../private.png', '/images/../private.png', '/images/%2e%2e/private.png', '/images/%252e%252e/private.png', '/images\\..\\private.png', 'https://user:pass@cdn.example.com/a.jpg']) {
    assert.equal(imageUrl(path, '/pokenova_tcg/'), null, String(path));
  }
});
