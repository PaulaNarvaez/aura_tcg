import { expect, test } from '@playwright/test';
import { formatPrice } from '../src/catalog.js';
import { store } from '../src/site.config.js';

const api = '**/api/products';
const storageKey = 'pokenova-cart-v1';
const card = {
  id: 'remote-card',
  name: 'Carta publicada de prueba',
  category: 'cards',
  price: 12990,
  stock: 2,
  image: 'https://images.example.test/carta.png',
  badge: 'Nuevo',
  tone: 'yellow',
  description: 'Producto de prueba para comprobar el catálogo conectado.',
};
const soldOut = {
  id: 'remote-sold-out',
  name: 'Accesorio agotado de prueba',
  category: 'accessories',
  price: 7990,
  stock: 0,
  image: null,
  badge: null,
  tone: 'mint',
  description: 'Producto sin existencias, disponible para consultar.',
};

async function seedCart(page, items) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: items });
}

async function storedCart(page) {
  return page.evaluate(key => JSON.parse(window.localStorage.getItem(key)), storageKey);
}

function productCard(page, product) {
  return page.locator('.product-card').filter({ has: page.getByRole('button', { name: product.name, exact: true }) });
}

test.beforeEach(async ({ context }) => {
  // Avoid contacting image hosts as well as the API; the URL remains inspectable.
  await context.route(card.image, route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="gold"/></svg>',
  }));
});

test('waits for remote inventory before restoring the saved cart and preserves remote image URLs', async ({ page, context }) => {
  const original = [
    { productId: card.id, quantity: 8 },
    { productId: 'retired-product', quantity: 1 },
    { productId: soldOut.id, quantity: 1 },
  ];
  await seedCart(page, original);
  let release;
  const responseGate = new Promise(resolve => { release = resolve; });
  const requests = [];
  await context.route(api, async route => {
    requests.push(route.request());
    await responseGate;
    await route.fulfill({ json: [card, soldOut] });
  });
  await page.goto('/');
  await expect(page.getByText('Cargando productos…', { exact: true })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(0);
  expect(await storedCart(page)).toEqual(original);
  release();

  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(page.locator('.catalog-label')).toHaveText('CATÁLOGO AURA');
  await expect(page.locator('#catalogo')).not.toContainText(/de ejemplo|catálogo de muestra/i);
  await expect.poll(() => storedCart(page)).toEqual([{ productId: card.id, quantity: 2 }]);
  await expect(productCard(page, card).getByRole('img', { name: card.name, exact: true })).toHaveAttribute('src', card.image);
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  const request = requests.at(-1);
  const endpoint = new URL(request.url());
  expect(endpoint.pathname).toBe('/api/products');
  expect(endpoint.search).toBe('');
  expect(request.method()).toBe('GET');
  expect(request.postData()).toBeNull();
  expect(request.headers().apikey).toBeUndefined();
  expect(request.headers().authorization).toBeUndefined();
  await page.getByRole('button', { name: 'Abrir carrito, 2 productos', exact: true }).click();
  const cart = page.getByRole('dialog', { name: 'Tu colección (2)' });
  await expect(cart.getByRole('heading', { name: card.name, exact: true })).toBeVisible();
  await expect(cart.getByRole('button', { name: `Aumentar cantidad de ${card.name}`, exact: true })).toBeDisabled();
  await expect(cart).not.toContainText(/de ejemplo|demostrativos/i);
  await expect(cart.locator('.cart-summary strong')).toHaveText(`${formatPrice(card.price * 2)} CLP`);
});

test('an API failure keeps the saved cart intact, and retry reconciles it after recovery', async ({ page, context }) => {
  const original = [{ productId: card.id, quantity: 7 }];
  await seedCart(page, original);
  let recovered = false;
  await context.route(api, route => recovered
    ? route.fulfill({ json: [card] })
    : route.fulfill({ status: 503, json: { message: 'Temporary test failure' } }));
  await page.goto('/');
  await expect(page.getByText('No pudimos cargar el catálogo.', { exact: true })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(0);
  expect(await storedCart(page)).toEqual(original);

  recovered = true;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect.poll(() => storedCart(page)).toEqual([{ productId: card.id, quantity: card.stock }]);
  await expect(page.getByText('No pudimos cargar el catálogo.', { exact: true })).toHaveCount(0);
});

test('an empty published inventory stays empty and does not fall back to demonstration products', async ({ page, context }) => {
  await context.route(api, route => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.locator('.catalog-label')).toHaveText('CATÁLOGO AURA');
  await expect(page.locator('.empty-search')).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(0);
  await expect(page.locator('#catalogo')).not.toContainText(/de ejemplo|catálogo de muestra|No pudimos cargar/i);
});

test('sold-out items remain consultable, while a real order uses current CLP values and clears its cart', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.route(api, route => route.fulfill({ json: [card, soldOut] }));
  await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><title>WhatsApp de prueba</title><body>Consulta de prueba</body></html>' }));
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(productCard(page, soldOut).getByRole('button', { name: `Agregar ${soldOut.name} al carrito`, exact: true })).toBeDisabled();
  await productCard(page, soldOut).getByRole('button', { name: `Ver detalles de ${soldOut.name}`, exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Un favorito de cerca' });
  await expect(details.getByRole('button', { name: 'Agregar al carrito', exact: true })).toBeDisabled();
  await expect(details.getByRole('link', { name: 'Consultar precio', exact: true })).toBeVisible();
  await expect(details).not.toContainText(/de ejemplo/i);
  await page.keyboard.press('Escape');

  await productCard(page, card).getByRole('button', { name: `Agregar ${card.name} al carrito`, exact: true }).click();
  await page.getByRole('button', { name: 'Abrir carrito, 1 productos', exact: true }).click();
  const order = page.getByRole('dialog').getByRole('link', { name: 'Consultar mi pedido' });
  const url = new URL(await order.getAttribute('href'));
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe(`/${store.whatsapp}`);
  expect(url.searchParams.get('text')).toContain(`1 × ${card.name}`);
  expect(url.searchParams.get('text')).toContain(formatPrice(card.price));
  expect(url.searchParams.get('text')).not.toMatch(/de ejemplo|demostrativ/i);
  const popupPromise = page.waitForEvent('popup');
  await order.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(url.href);
  await popup.close();
  await expect.poll(() => storedCart(page)).toEqual([]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
});

test('invalid inventory data shows an error instead of exposing misleading prices or wiping saved items', async ({ page, context }) => {
  const original = [{ productId: card.id, quantity: 1 }];
  await seedCart(page, original);
  await context.route(api, route => route.fulfill({ json: [{ ...card, price: '12990' }] }));
  await page.goto('/');
  await expect(page.getByText('No pudimos cargar el catálogo.', { exact: true })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(0);
  expect(await storedCart(page)).toEqual(original);
});
