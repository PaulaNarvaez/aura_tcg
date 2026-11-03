import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSupabaseConfig, imageUrl, loadProducts, validateSupabaseConfig } from '../src/catalog-source.js';

const url = 'https://pokenova.supabase.co';
const key = 'sb_publishable_test_public_key';
const row = { id: 'caja-1', name: 'Caja para cartas', category: 'accessories', price: 12990, stock: 2, image: null };
const jwt = claims => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const response = (data, options) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, ...options });

test('either public setting enables configuration validation, including partial configuration', () => {
  assert.equal(hasSupabaseConfig(), false);
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_PUBLISHABLE_KEY: '' }), false);
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_URL: url }), true);
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: key }), true);
  assert.equal(hasSupabaseConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key }), true);
});

test('invalid origins, incomplete configuration and privileged or malformed keys fail before network access', async () => {
  const fetchImpl = () => { assert.fail('Invalid configuration must not reach the network'); };
  for (const options of [
    {}, { url }, { key }, { url: 'http://pokenova.supabase.co', key },
    { url: `${url}/rest`, key }, { url: `${url}?token=private`, key },
    { url: `${url}#fragment`, key }, { url: 'https://user:password@pokenova.supabase.co', key },
    { url, key: 'sb_secret_private_key' }, { url, key: jwt({ role: 'service_role' }) },
    { url, key: jwt({ role: 'authenticated' }) }, { url, key: 'malformed' },
    { url, key: 'header.invalid-payload.signature' }, { url, key: jwt(null) },
  ]) {
    assert.throws(() => validateSupabaseConfig(options), error => {
      assert.equal(error.message, 'Revisa la configuración pública del catálogo.');
      return true;
    });
    await assert.rejects(loadProducts({ ...options, fetchImpl }), /configuración pública/);
  }
});

test('build-time validation returns normalized public settings and shares runtime key handling', () => {
  const config = validateSupabaseConfig({ url: ` ${url}/ `, key: ` ${key} ` });
  assert.equal(config.endpoint.href, `${url}/`);
  assert.equal(config.publicKey, key);
  assert.equal(config.kind, 'publishable');
  const legacyKey = jwt({ role: 'anon' });
  assert.equal(validateSupabaseConfig({ url, key: legacyKey }).kind, 'anon');
});

test('publishable keys use apikey without Bearer and database rows receive valid UI defaults', async () => {
  const items = await loadProducts({ url: `${url}/`, key: ` ${key} `, fetchImpl: async (input, init) => {
    const request = new URL(input);
    assert.equal(request.origin, url);
    assert.equal(request.pathname, '/rest/v1/products');
    assert.equal(request.searchParams.get('select'), 'id,name,category,price,image,badge,tone,description,stock');
    assert.equal(request.searchParams.get('is_published'), 'eq.true');
    assert.equal(request.searchParams.get('order'), 'sort_order.asc,id.asc');
    assert.equal(request.searchParams.get('limit'), '1000');
    assert.equal(request.searchParams.get('offset'), '0');
    assert.equal(init.headers.apikey, key);
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers.Prefer, 'count=exact');
    return response([row, { ...row, id: 'carta', category: 'cards', image: 'https://cdn.example.com/carta.png', price: 0, stock: 0, badge: ' Nuevo ', tone: 'yellow', description: 'Una carta.' }]);
  } });
  assert.deepEqual(items, [
    { ...row, categoryLabel: 'Accesorios', tone: 'mint', description: '' },
    { id: 'carta', name: row.name, category: 'cards', categoryLabel: 'Cartas', price: 0, stock: 0, image: 'https://cdn.example.com/carta.png', badge: 'Nuevo', tone: 'yellow', description: 'Una carta.' },
  ]);
});

test('legacy anon JWTs use both apikey and Bearer authorization', async () => {
  const publicJwt = jwt({ role: 'anon', iss: 'supabase' });
  await loadProducts({ url, key: publicJwt, fetchImpl: async (_, init) => {
    assert.equal(init.headers.apikey, publicJwt);
    assert.equal(init.headers.Authorization, `Bearer ${publicJwt}`);
    return response([]);
  } });
});

test('invalid products and duplicate ids reject the entire catalog rather than showing partial stock', async () => {
  for (const invalid of [
    null, [], { ...row, id: '' }, { ...row, name: ' ' }, { ...row, category: 'all' },
    { ...row, price: -1 }, { ...row, price: 12.5 }, { ...row, price: '1000' },
    { ...row, stock: -1 }, { ...row, stock: 1.1 }, { ...row, stock: Number.MAX_SAFE_INTEGER + 1 },
    { ...row, image: '/images/caja.jpg' }, { ...row, image: 'http://cdn.example.com/a.jpg' },
    { ...row, image: '//cdn.example.com/a.jpg' }, { ...row, image: 'javascript:alert(1)' },
    { ...row, description: 12 }, { ...row, badge: [] },
  ]) {
    await assert.rejects(loadProducts({ url, key, fetchImpl: async () => response([invalid]) }), /No pudimos cargar/);
  }
  await assert.rejects(loadProducts({ url, key, fetchImpl: async () => response([row, row]) }), /No pudimos cargar/);
});

test('pagination follows Content-Range when the server applies a smaller page limit', async () => {
  const offsets = [];
  const items = await loadProducts({ url, key, fetchImpl: async input => {
    const offset = Number(new URL(input).searchParams.get('offset'));
    offsets.push(offset);
    const data = Array.from({ length: offset === 2 ? 1 : 2 }, (_, index) => ({ ...row, id: `product-${offset + index}` }));
    return response(data, { headers: { 'Content-Range': `${offset}-${offset + data.length - 1}/3` } });
  } });
  assert.deepEqual(offsets, [0, 2]);
  assert.deepEqual(items.map(item => item.id), ['product-0', 'product-1', 'product-2']);
});

test('pagination without a count continues full pages and accepts an empty catalog', async () => {
  const offsets = [];
  const items = await loadProducts({ url, key, fetchImpl: async input => {
    const offset = Number(new URL(input).searchParams.get('offset'));
    offsets.push(offset);
    return response(offset === 0 ? Array.from({ length: 1000 }, (_, index) => ({ ...row, id: `product-${index}` })) : []);
  } });
  assert.deepEqual(offsets, [0, 1000]);
  assert.equal(items.length, 1000);
  assert.deepEqual(await loadProducts({ url, key, fetchImpl: async () => response([]) }), []);
  await assert.rejects(loadProducts({ url, key, fetchImpl: async () => response([], { headers: { 'Content-Range': '*/3' } }) }), /No pudimos cargar/);
});

test('network, HTTP, invalid JSON and backend payloads produce a generic error without backend details', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('private network detail'); },
    async () => response({ message: 'private backend detail' }, { status: 403 }),
    async () => new Response('not json'),
    async () => response({ message: 'private backend detail' }),
  ]) {
    await assert.rejects(loadProducts({ url, key, fetchImpl }), error => {
      assert.equal(error.message, 'No pudimos cargar el catálogo. Inténtalo nuevamente.');
      return true;
    });
  }
});

test('aborting prevents requests or propagates cancellation during an in-flight request', async () => {
  const before = new AbortController();
  before.abort();
  await assert.rejects(loadProducts({ url, key, signal: before.signal, fetchImpl: () => assert.fail('Already aborted') }), { name: 'AbortError' });
  const during = new AbortController();
  await assert.rejects(loadProducts({ url, key, signal: during.signal, fetchImpl: async (_, init) => {
    assert.equal(init.signal, during.signal);
    during.abort();
    throw during.signal.reason;
  } }), { name: 'AbortError' });
});

test('image URLs preserve remote HTTPS and resolve bundled files under a Pages subpath', () => {
  assert.equal(imageUrl('/images/caja.png', '/pokenova_tcg/'), '/pokenova_tcg/images/caja.png');
  assert.equal(imageUrl('images/caja.png'), '/images/caja.png');
  assert.equal(imageUrl('/favicon.svg?version=2', '/pokenova_tcg/'), '/pokenova_tcg/favicon.svg?version=2');
  assert.equal(imageUrl('https://cdn.example.com/caja.png?width=400', '/pokenova_tcg/'), 'https://cdn.example.com/caja.png?width=400');
  for (const path of [null, '', 'javascript:alert(1)', 'http://cdn.example.com/a.jpg', '//cdn.example.com/a.jpg', '../private.png', '/images/../private.png', '/images/%2e%2e/private.png', '/images/%252e%252e/private.png', '/images\\..\\private.png', 'https://user:pass@cdn.example.com/a.jpg']) {
    assert.equal(imageUrl(path, '/pokenova_tcg/'), null, String(path));
  }
});
