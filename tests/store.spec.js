import { expect, test } from '@playwright/test';
import { products, categories, formatPrice } from '../src/catalog.js';
import { store } from '../src/site.config.js';

const availableProducts = products.filter(product => product.stock > 0);
const cartProduct = availableProducts.find(product => product.stock >= 2) ?? availableProducts[0];

function decodedWhatsapp(href) {
  const url = new URL(href);
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe(`/${store.whatsapp}`);
  return url.searchParams.get('text');
}

async function stubWhatsapp(context) {
  // Context routing also intercepts the popup's initial navigation. No message
  // is sent and no WhatsApp server is contacted by these interaction tests.
  await context.route('https://wa.me/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><title>Consulta de prueba</title><body><h1>WhatsApp de prueba</h1></body></html>',
  }));
}

async function openStubbedWhatsapp(page, link) {
  const href = await link.getAttribute('href');
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(href);
  await expect(popup.getByRole('heading', { name: 'WhatsApp de prueba' })).toBeVisible();
  await popup.close();
}

async function storedCart(page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('pokenova-cart-v1')));
}

function addButton(page, product) {
  return productCard(page, product).getByRole('button', { name: `Agregar ${product.name} al carrito`, exact: true });
}

function productCard(page, product) {
  return page.locator('.product-card').nth(products.findIndex(item => item.id === product.id));
}

async function expectEmptyCart(page) {
  await page.getByRole('button', { name: 'Abrir carrito, 0 productos' }).click();
  const cart = page.getByRole('dialog', { name: 'Tu colección (0)' });
  await expect(cart.getByRole('heading', { name: 'Una aventura por llenar.' })).toBeVisible();
  await expect(cart.getByRole('link', { name: 'Consultar mi pedido' })).toHaveCount(0);
  return cart;
}

async function expectNoAvailableProducts(page) {
  // Empty and sold-out catalogs remain usable; cart logic is also covered by
  // independent unit fixtures even when the live inventory has no stock.
  if (products.length === 0) {
    await expect(page.locator('.empty-search')).toBeVisible();
  } else {
    await expect(addButton(page, products[0])).toBeDisabled();
    await expect(productCard(page, products[0])).toContainText('Agotado');
  }
  await expectEmptyCart(page);
  await expect.poll(() => storedCart(page)).toEqual([]);
}

function normalizeSearch(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL');
}

async function exerciseQuickSearch(page, submitWithEnter = false) {
  const quickSearch = page.getByRole('search', { name: 'Búsqueda rápida de productos', exact: true });
  const quickInput = quickSearch.getByRole('searchbox', { name: 'Buscar productos', exact: true });
  await expect(page.getByRole('searchbox')).toHaveCount(1);
  await expect(page.getByRole('search')).toHaveCount(1);
  await expect(quickSearch).toBeVisible();
  await expect(quickInput).toBeVisible();
  if (products.length === 0) return;

  const product = products[0];
  const otherCategory = categories.find(item => item.id !== 'all' && item.id !== product.category);
  if (otherCategory) {
    await page.locator('.filter-tabs').getByRole('button', { name: otherCategory.label, exact: true }).click();
  }
  await quickInput.fill(product.name);
  const all = categories.find(item => item.id === 'all');
  await expect(page.locator('.filter-tabs').getByRole('button', { name: all.label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (submitWithEnter) await quickInput.press('Enter');
  else await quickSearch.getByRole('button', { name: 'Buscar', exact: true }).click();

  const catalogHeading = page.locator('#catalog-title');
  await expect(quickInput).toHaveValue(product.name);
  await expect(page.locator('.catalog-current-search')).toContainText(product.name);
  await expect(catalogHeading).toBeFocused();
  await expect(catalogHeading).toBeInViewport();
  const matches = products.filter(item => normalizeSearch(`${item.name} ${item.categoryLabel} ${item.description}`).includes(normalizeSearch(product.name)));
  await expect(page.locator('.product-name')).toHaveText(matches.map(item => item.name));
  // Submission preserves the query; clearing it restores the complete inventory.
  await page.getByRole('button', { name: 'Quitar búsqueda', exact: true }).click();
  await expect(catalogHeading).toBeFocused();
  await expect(quickInput).toHaveValue('');
  await expect(page.locator('.product-card')).toHaveCount(products.length);
}

async function screenshot(page, path) {
  await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
}

test('desktop browsing, product details, persistent cart, and clearing a consulted order', async ({ page, context }) => {
  await stubWhatsapp(context);
  await page.goto('/');
  await expect(page).toHaveTitle(/Aura TCG & Print/);
  const logos = page.locator('img.brand-logo');
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect.poll(() => logo.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  }
  const mascot = page.locator('.hero-mascot');
  await expect(mascot).toHaveAttribute('src', /lucario-hero\.png$/);
  await expect.poll(() => mascot.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);
  await expect(page.locator('.product-card')).toHaveCount(products.length);

  const category = categories.find(item => item.id !== 'all');
  if (category) {
    const categoryProducts = products.filter(product => product.category === category.id);
    await page.locator('.filter-tabs').getByRole('button', { name: category.label, exact: true }).click();
    await expect(page.locator('.product-card')).toHaveCount(categoryProducts.length);
    await expect(page.locator('.result-count')).toHaveText(`${categoryProducts.length} ${categoryProducts.length === 1 ? 'producto' : 'productos'}`);
  }
  await exerciseQuickSearch(page, true);
  await page.locator('.filter-tabs').getByRole('button', { name: categories.find(item => item.id === 'all').label, exact: true }).click();
  await page.getByRole('combobox', { name: 'Ordenar productos' }).selectOption('price-asc');
  await expect(page.locator('.product-name')).toHaveText([...products].sort((a, b) => a.price - b.price).map(product => product.name));
  await page.getByRole('combobox', { name: 'Ordenar productos' }).selectOption('price-desc');
  await expect(page.locator('.product-name')).toHaveText([...products].sort((a, b) => b.price - a.price).map(product => product.name));
  await page.getByRole('combobox', { name: 'Ordenar productos' }).selectOption('featured');
  await expect(page.locator('.product-name')).toHaveText(products.map(product => product.name));

  if (products.length > 0) {
    const product = products[0];
    const detailsTrigger = productCard(page, product).getByRole('button', { name: `Ver detalles de ${product.name}`, exact: true });
    await detailsTrigger.click();
    const details = page.getByRole('dialog', { name: 'Un favorito de cerca' });
    await expect(details.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
    await expect(details.locator('.detail-price strong')).toHaveText(`${formatPrice(product.price)} CLP`);
    if (product.image) {
      const image = details.getByRole('img', { name: product.name, exact: true });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    }
    expect(decodedWhatsapp(await details.getByRole('link', { name: 'Consultar precio' }).getAttribute('href')))
      .toContain(`precio y disponibilidad de ${product.name}`);
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(detailsTrigger).toBeFocused();
  }

  if (!cartProduct) {
    await expectNoAvailableProducts(page);
    await page.keyboard.press('Escape');
    await screenshot(page, '/tmp/aura-desktop.png');
    return;
  }
  const quantity = Math.min(2, cartProduct.stock);
  await addButton(page, cartProduct).click();
  await page.getByRole('button', { name: 'Abrir carrito, 1 productos' }).click();
  let cart = page.getByRole('dialog', { name: 'Tu colección (1)' });
  await expect(cart.getByRole('heading', { name: cartProduct.name, exact: true })).toBeVisible();
  if (quantity === 2) {
    await cart.getByRole('button', { name: `Aumentar cantidad de ${cartProduct.name}`, exact: true }).click();
  } else {
    await expect(cart.getByRole('button', { name: `Aumentar cantidad de ${cartProduct.name}`, exact: true })).toBeDisabled();
  }
  cart = page.getByRole('dialog', { name: `Tu colección (${quantity})` });
  await expect(cart.getByLabel(`Cantidad: ${quantity}`, { exact: true })).toHaveText(String(quantity));
  await page.reload();
  await page.getByRole('button', { name: `Abrir carrito, ${quantity} productos` }).click();
  cart = page.getByRole('dialog', { name: `Tu colección (${quantity})` });
  await expect(cart.getByLabel(`Cantidad: ${quantity}`, { exact: true })).toHaveText(String(quantity));
  if (quantity === 2) {
    await cart.getByRole('button', { name: `Reducir cantidad de ${cartProduct.name}`, exact: true }).click();
    cart = page.getByRole('dialog', { name: 'Tu colección (1)' });
    await expect(cart.getByLabel('Cantidad: 1', { exact: true })).toHaveText('1');
  }
  await cart.getByRole('button', { name: `Eliminar ${cartProduct.name}`, exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Una aventura por llenar.' })).toBeVisible();
  // Removing the focused control must not let keyboard focus escape the modal.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Explorar la tienda' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abrir carrito, 0 productos' })).toBeFocused();
  for (let unit = 0; unit < quantity; unit += 1) await addButton(page, cartProduct).click();
  await page.getByRole('button', { name: `Abrir carrito, ${quantity} productos` }).click();
  const orderLink = page.getByRole('dialog').getByRole('link', { name: 'Consultar mi pedido' });
  const message = decodedWhatsapp(await orderLink.getAttribute('href'));
  expect(message).toContain(`${quantity} × ${cartProduct.name}`);
  expect(message).toContain(`${formatPrice(cartProduct.price)} c/u, valor de ejemplo`);
  expect(message).toContain(`Total de ejemplo: ${formatPrice(quantity * cartProduct.price)} CLP`);
  expect(message).toContain('¿Me confirman el valor final y el envío?');
  await openStubbedWhatsapp(page, orderLink);
  await expect(page.getByRole('button', { name: 'Abrir carrito, 0 productos' })).toBeVisible();
  await expect.poll(() => storedCart(page)).toEqual([]);
  await page.reload();
  await expectEmptyCart(page);
  await page.keyboard.press('Escape');
  await screenshot(page, '/tmp/aura-desktop.png');
});

test('mobile navigation, cart, and page width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const openMenu = page.getByRole('button', { name: 'Abrir menú' });
  await expect(openMenu).toBeVisible();
  await openMenu.click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'Impresión 3D', exact: true }).click();
  await expect(page).toHaveURL(/#impresion-3d$/);
  await expect(page.locator('#impresion-3d')).toBeVisible();
  await expect(openMenu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Navegación principal', exact: true })).not.toBeVisible();
  await openMenu.click();
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'Quiénes somos' }).click();
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Navegación principal', exact: true })).not.toBeVisible();
  await exerciseQuickSearch(page);
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);

  let cart;
  if (cartProduct) {
    await addButton(page, cartProduct).click();
    await page.getByRole('button', { name: 'Abrir carrito, 1 productos' }).click();
    cart = page.getByRole('dialog', { name: 'Tu colección (1)' });
    await expect(cart.getByRole('link', { name: 'Consultar mi pedido' })).toBeVisible();
    expect(decodedWhatsapp(await cart.getByRole('link', { name: 'Consultar mi pedido' }).getAttribute('href')))
      .toContain(`Total de ejemplo: ${formatPrice(cartProduct.price)} CLP`);
  } else {
    cart = await expectEmptyCart(page);
  }
  await expect(cart).toBeVisible();
  const cartBounds = await cart.boundingBox();
  expect(cartBounds.x).toBeGreaterThanOrEqual(0);
  expect(cartBounds.x + cartBounds.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await screenshot(page, '/tmp/aura-mobile.png');
});

test('consulting one product clears only that product and preserves other available cart items', async ({ page, context }) => {
  await stubWhatsapp(context);
  await page.goto('/');
  if (!cartProduct) {
    await expectNoAvailableProducts(page);
    return;
  }
  const otherProduct = availableProducts.find(product => product.id !== cartProduct.id);
  const quantity = Math.min(2, cartProduct.stock);
  for (let unit = 0; unit < quantity; unit += 1) await addButton(page, cartProduct).click();
  if (otherProduct) await addButton(page, otherProduct).click();
  await productCard(page, cartProduct).getByRole('button', { name: `Ver detalles de ${cartProduct.name}`, exact: true }).click();
  const link = page.getByRole('dialog').getByRole('link', { name: 'Consultar precio' });
  expect(decodedWhatsapp(await link.getAttribute('href'))).toContain(cartProduct.name);
  await openStubbedWhatsapp(page, link);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const remaining = otherProduct ? [{ productId: otherProduct.id, quantity: 1 }] : [];
  await expect(page.getByRole('button', { name: `Abrir carrito, ${remaining.length} productos` })).toBeVisible();
  await expect.poll(() => storedCart(page)).toEqual(remaining);
  await page.reload();
  await page.getByRole('button', { name: `Abrir carrito, ${remaining.length} productos` }).click();
  await expect(page.getByRole('dialog').locator('.cart-item')).toHaveCount(remaining.length);
  if (otherProduct) {
    await expect(page.getByRole('dialog').getByRole('heading', { name: otherProduct.name, exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Una aventura por llenar.' })).toBeVisible();
  }
});

test('buyback offers challa and sealed products through WhatsApp and removes market requests', async ({ page, context }) => {
  const marketRequests = [];
  page.on('request', request => {
    if (request.url().includes('api.tcgdex.net')) marketRequests.push(request.url());
  });
  await stubWhatsapp(context);
  await page.goto('/');
  await expect(page.locator('#compramos')).toBeVisible();
  const challa = page.locator('#compramos').getByRole('link', { name: 'Vender mi challa' });
  const sealed = page.locator('#compramos').getByRole('link', { name: 'Ofrecer productos sellados' });
  expect(decodedWhatsapp(await challa.getAttribute('href'))).toMatch(/challa/i);
  expect(decodedWhatsapp(await sealed.getAttribute('href'))).toMatch(/sellados/i);
  await openStubbedWhatsapp(page, challa);
  await openStubbedWhatsapp(page, sealed);
  await expect(page.getByRole('link', { name: 'Radar TCG' })).toHaveCount(0);
  await expect(page.locator('#mercado')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('USD');
  await expect(page.locator('.hero-copy')).not.toContainText('PARA TU LADO COLECCIONISTA');
  expect(marketRequests).toEqual([]);
});

async function submitStubbedCustomQuote(page, form) {
  const popupPromise = page.waitForEvent('popup');
  await form.getByRole('button', { name: 'Cotizar por WhatsApp', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'WhatsApp de prueba' })).toBeVisible();
  const url = popup.url();
  expect([...new URL(url).searchParams.keys()]).toEqual(['text']);
  const message = decodedWhatsapp(url);
  await popup.close();
  return message;
}

test('custom 3D services select the requested piece and send its details as one WhatsApp quote', async ({ page, context }) => {
  await stubWhatsapp(context);
  await page.goto('/');
  const section = page.locator('#impresion-3d');
  const cards = section.locator('.custom-prints-card');
  const form = section.locator('form');
  const type = form.getByRole('combobox', { name: 'Tipo de pieza', exact: true });
  const idea = form.getByRole('textbox', { name: 'Tu idea (obligatorio)', exact: true });
  await expect(cards).toHaveCount(3);
  // Until real product photos are supplied, the services use illustrations.
  await expect(cards.locator('img')).toHaveCount(0);
  await expect(cards.locator('svg.custom-prints-art')).toHaveCount(3);
  for (const [id, name] of [['deck-box', 'Cajas para mazos'], ['organizer', 'Organizadores'], ['card-stand', 'Soportes para cartas']]) {
    const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.filter({ hasNot: page.getByRole('heading', { name, exact: true }) })).toHaveCount(2);
    for (const otherCard of await cards.filter({ hasNot: page.getByRole('heading', { name, exact: true }) }).all()) {
      await expect(otherCard).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(type).toHaveValue(id);
    await expect(idea).toBeFocused();
  }
  await type.selectOption('organizer');
  await expect(cards.filter({ has: page.getByRole('heading', { name: 'Organizadores', exact: true }) })).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.filter({ has: page.getByRole('heading', { name: 'Soportes para cartas', exact: true }) })).toHaveAttribute('aria-pressed', 'false');
  const format = form.getByRole('combobox', { name: 'Formato de tu colección', exact: true });
  for (const value of ['Por definir', 'Cartas con funda', 'Cartas graduadas', 'Toploaders']) {
    await format.selectOption({ label: value });
    await expect(format).toHaveValue(value);
  }
  await form.getByRole('spinbutton', { name: 'Ancho (mm)', exact: true }).fill('125.5');
  await form.getByRole('spinbutton', { name: 'Alto (mm)', exact: true }).fill('90');
  await form.getByRole('spinbutton', { name: 'Fondo (mm)', exact: true }).fill('64.2');
  await form.getByRole('textbox', { name: 'Color o combinación (opcional)', exact: true }).fill('Amarillo & negro');
  await idea.fill('Quiero separar 80 cartas Pokémon + accesorios; con toploaders y un diseño de Eevee.');
  const message = await submitStubbedCustomQuote(page, form);
  expect(message).toContain('Quiero cotizar una impresión 3D a medida.');
  expect(message).toContain('Tipo: Organizadores');
  expect(message).toContain('Formato de mi colección: Toploaders');
  expect(message).toContain('Ancho: 125.5 mm');
  expect(message).toContain('Alto: 90 mm');
  expect(message).toContain('Fondo: 64.2 mm');
  expect(message).toContain('Color o combinación: Amarillo & negro');
  expect(message).toContain('Mi idea: Quiero separar 80 cartas Pokémon + accesorios; con toploaders y un diseño de Eevee.');
  expect(message).toContain('el diseño, el material, el precio y la disponibilidad');
});

test('a custom quote requires an idea, rejects invalid dimensions, and allows dimensions still to be confirmed', async ({ page, context }) => {
  await stubWhatsapp(context);
  await page.goto('/');
  const popups = [];
  page.on('popup', popup => popups.push(popup));
  const form = page.locator('#impresion-3d form');
  const idea = form.getByRole('textbox', { name: 'Tu idea (obligatorio)', exact: true });
  const width = form.getByRole('spinbutton', { name: 'Ancho (mm)', exact: true });
  const submit = form.getByRole('button', { name: 'Cotizar por WhatsApp', exact: true });
  await submit.click();
  await expect(idea).toBeFocused();
  expect(await idea.evaluate(element => element.validity.valueMissing)).toBe(true);
  expect(popups).toHaveLength(0);
  await idea.fill('   ');
  await submit.click();
  await expect(idea).toBeFocused();
  expect(await idea.evaluate(element => element.validity.customError)).toBe(true);
  expect(popups).toHaveLength(0);
  await idea.fill('Necesito una caja para mi mazo con fundas; no sé las medidas todavía.');
  for (const invalidWidth of ['0', '-2.5']) {
    await width.fill(invalidWidth);
    await submit.click();
    await expect(width).toBeFocused();
    expect(await width.evaluate(element => element.validity.rangeUnderflow)).toBe(true);
    expect(popups).toHaveLength(0);
  }
  await width.fill('1.05');
  await submit.click();
  await expect(width).toBeFocused();
  expect(await width.evaluate(element => element.validity.stepMismatch)).toBe(true);
  expect(popups).toHaveLength(0);
  await width.fill('');
  const message = await submitStubbedCustomQuote(page, form);
  expect(popups).toHaveLength(1);
  expect(message).toContain('Tipo: Cajas para mazos');
  expect(message).toContain('Formato de mi colección: Por definir');
  expect(message).toContain('Medidas por confirmar.');
  expect(message).toContain('Mi idea: Necesito una caja para mi mazo con fundas; no sé las medidas todavía.');
  expect(message).not.toContain('Color o combinación:');
});

test('a blocked localStorage getter still allows a usable in-memory cart', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Synthetic blocked storage', 'SecurityError'); },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (cartProduct) {
    const quantity = Math.min(2, cartProduct.stock);
    await addButton(page, cartProduct).click();
    await page.getByRole('button', { name: 'Abrir carrito, 1 productos' }).click();
    if (quantity === 2) {
      await page.getByRole('dialog').getByRole('button', { name: `Aumentar cantidad de ${cartProduct.name}`, exact: true }).click();
    } else {
      await expect(page.getByRole('dialog').getByRole('button', { name: `Aumentar cantidad de ${cartProduct.name}`, exact: true })).toBeDisabled();
    }
    await expect(page.getByRole('dialog', { name: `Tu colección (${quantity})` })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: `Abrir carrito, ${quantity} productos` }).click();
    await expect(page.getByRole('dialog').getByLabel(`Cantidad: ${quantity}`, { exact: true })).toHaveText(String(quantity));
  } else {
    await expectEmptyCart(page);
  }
  expect(errors).toEqual([]);
});

test('decorative sparkles animate without obstructing controls and respect reduced motion', async ({ page }) => {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.locator('.hero-mascot').evaluate(el => getComputedStyle(el).animationName)).toBe('floating');
  await expect.poll(() => page.locator('.ticker > div').evaluate(el => getComputedStyle(el).animationName)).toBe('marquee');
  await expect.poll(() => page.locator('.background-orb').first().evaluate(el => getComputedStyle(el).animationName)).toBe('backgroundDrift');
  await expect.poll(() => page.locator('.background-spark').first().evaluate(el => getComputedStyle(el).animationName)).toBe('backgroundTwinkle');
  const glints = page.locator('.background-glint');
  expect(await glints.count()).toBeGreaterThan(0);
  await expect.poll(() => glints.first().evaluate(el => getComputedStyle(el).animationName)).toBe('glintTwinkle');
  const decoration = await page.locator('.animated-background').evaluate(element => ({
    hidden: element.getAttribute('aria-hidden'),
    pointerEvents: getComputedStyle(element).pointerEvents,
    durations: [...element.querySelectorAll('.background-glint')].map(glint => parseFloat(getComputedStyle(glint).animationDuration)),
  }));
  expect(decoration.hidden).toBe('true');
  expect(decoration.pointerEvents).toBe('none');
  expect(decoration.durations.every(duration => duration > 0)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    animations: ['.hero-mascot', '.ticker > div', '.hero-spark', '.wave', '.chat-emoji', '.background-orb', '.background-spark', '.background-glint']
      .map(selector => getComputedStyle(document.querySelector(selector)).animationName),
  }));
  expect(motion.scroll).toBe('auto');
  expect(motion.animations).toEqual(Array(8).fill('none'));
});

function overlaps(a, b) {
  return a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1
    && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`category layout, custom quote, navigation, and brand remain intact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('searchbox')).toHaveCount(1);
    await expect(page.locator('.shop-module')).toHaveCount(5);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(width);
    for (const module of await page.locator('.shop-module').all()) {
      const bounds = await module.boundingBox();
      const copy = await module.locator('.shop-module-copy').boundingBox();
      const visual = await module.locator('.shop-module-visual').boundingBox();
      const arrow = await module.locator('.shop-module-arrow').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      for (const box of [copy, visual, arrow]) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
        expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(bounds.y - 1);
        expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
      }
      expect(overlaps(copy, visual)).toBe(false);
    }
    const sidebar = page.locator('.catalog-sidebar');
    const sidebarBounds = await sidebar.boundingBox();
    expect(sidebarBounds.x).toBeGreaterThanOrEqual(0);
    expect(sidebarBounds.x + sidebarBounds.width).toBeLessThanOrEqual(width);
    for (const category of categories) {
      const filter = sidebar.getByRole('button', { name: category.label, exact: true });
      const count = category.id === 'all' ? products.length : products.filter(product => product.category === category.id).length;
      await expect(filter.locator('.department-count')).toHaveText(String(count));
    }
    const selectedId = { 320: 'cards', 390: 'sealed', 768: 'plush', 1024: 'accessories' }[width];
    if (selectedId) {
      await page.locator(`.shop-module[data-department="${selectedId}"]`).click();
      const category = categories.find(item => item.id === selectedId);
      const matches = products.filter(product => product.category === selectedId);
      await expect(page.locator('.product-name')).toHaveText(matches.map(product => product.name));
      await expect(sidebar.getByRole('button', { name: category.label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    } else {
      const printModule = page.locator('.shop-module[data-department="print"]');
      await expect(printModule).toHaveAttribute('href', '#impresion-3d');
      await printModule.click();
      await expect(page).toHaveURL(/#impresion-3d$/);
    }
    const departments = page.getByRole('navigation', { name: 'Departamentos de la tienda', exact: true });
    const departmentChoice = { 320: ['sealed', 'Sellados y ETB'], 390: ['plush', 'Peluches'], 768: ['accessories', 'Accesorios'], 1024: ['cards', 'Cartas'], 1440: ['all', 'Toda la tienda'] }[width];
    await departments.getByRole('button', { name: departmentChoice[1], exact: true }).click();
    await expect(departments.getByRole('button', { name: departmentChoice[1], exact: true })).toHaveAttribute('aria-pressed', 'true');
    const departmentProducts = departmentChoice[0] === 'all' ? products : products.filter(product => product.category === departmentChoice[0]);
    await expect(page.locator('.product-name')).toHaveText(departmentProducts.map(product => product.name));
    await expect(page.getByRole('navigation', { name: 'Ruta del catálogo', exact: true })).toBeVisible();
    if (width === 390 && products.length > 0) {
      const product = products[0];
      const quickInput = page.getByRole('searchbox', { name: 'Buscar productos', exact: true });
      await quickInput.fill(product.name);
      const queryCategories = [categories.find(item => item.id === product.category), categories.find(item => item.id !== 'all' && item.id !== product.category)].filter(Boolean);
      let lastMatches = [];
      for (const category of queryCategories) {
        await sidebar.getByRole('button', { name: category.label, exact: true }).click();
        await expect(quickInput).toHaveValue(product.name);
        await expect(page.locator('.catalog-current-search')).toContainText(product.name);
        const matches = products.filter(item => item.category === category.id && normalizeSearch(`${item.name} ${item.categoryLabel} ${item.description}`).includes(normalizeSearch(product.name)));
        await expect(page.locator('.product-name')).toHaveText(matches.map(item => item.name));
        lastMatches = matches;
      }
      if (queryCategories.length > 0 && lastMatches.length === 0) {
        await page.getByRole('button', { name: 'Ver todos los productos', exact: true }).click();
        await expect(page.locator('#catalog-title')).toBeFocused();
        await expect(quickInput).toHaveValue('');
        await expect(page.locator('.product-card')).toHaveCount(products.length);
      } else {
        await quickInput.fill('');
      }
    }
    await sidebar.getByRole('button', { name: categories.find(item => item.id === 'all').label, exact: true }).click();
    const section = page.locator('#impresion-3d');
    await expect(section.locator('.custom-prints-card')).toHaveCount(3);
    for (const card of await section.locator('.custom-prints-card').all()) {
      const bounds = await card.boundingBox();
      const art = await card.locator('.custom-prints-art').boundingBox();
      const copy = await card.locator('.custom-prints-card-copy').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(overlaps(art, copy)).toBe(false);
    }
    const form = section.locator('form');
    const formBounds = await form.boundingBox();
    const introBounds = await section.locator('.custom-prints-form-intro').boundingBox();
    expect(formBounds.x).toBeGreaterThanOrEqual(0);
    expect(formBounds.x + formBounds.width).toBeLessThanOrEqual(width);
    expect(overlaps(formBounds, introBounds)).toBe(false);
    for (const field of await form.locator('.custom-prints-field').all()) {
      const label = await field.locator('label').boundingBox();
      const control = await field.locator('input, select, textarea').boundingBox();
      expect(control.width).toBeGreaterThan(0);
      expect(control.x).toBeGreaterThanOrEqual(formBounds.x - 1);
      expect(control.x + control.width).toBeLessThanOrEqual(formBounds.x + formBounds.width + 1);
      expect(overlaps(label, control)).toBe(false);
    }
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    if (width <= 1050) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(nav).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Abrir menú' })).not.toBeVisible();
    }
    const links = await nav.getByRole('link').all();
    expect(links).toHaveLength(4);
    const navBounds = await nav.boundingBox();
    expect(navBounds.x).toBeGreaterThanOrEqual(0);
    expect(navBounds.x + navBounds.width).toBeLessThanOrEqual(width);
    const linkBounds = await Promise.all(links.map(link => link.boundingBox()));
    for (let index = 1; index < linkBounds.length; index += 1) {
      expect(overlaps(linkBounds[index - 1], linkBounds[index])).toBe(false);
    }
    if (width <= 1050) {
      await nav.getByRole('link', { name: 'Impresión 3D', exact: true }).click();
      await expect(nav).not.toBeVisible();
    }
    const logo = page.locator('header .brand img.brand-logo');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    const faviconUrl = new URL(faviconHref, page.url());
    expect(faviconUrl.origin).toBe(new URL(page.url()).origin);
    const favicon = await page.request.get(faviconUrl.href);
    expect(favicon.ok()).toBe(true);
    expect(favicon.headers()['content-type']).toMatch(/^image\//);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: `/tmp/aura-refresh-${width}.png`, fullPage: true, animations: 'disabled' });
  });
}
