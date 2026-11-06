import { categories } from './catalog.js';

const categoryLabels = new Map(categories.filter(({ id }) => id !== 'all').map(({ id, label }) => [id, label]));
const tones = new Set(['yellow', 'orange', 'purple', 'peach', 'blue', 'mint']);
const configurationError = () => new Error('Revisa la dirección de la API del catálogo.');
const catalogError = () => new Error('No pudimos cargar el catálogo. Inténtalo nuevamente.');
const textValue = value => typeof value === 'string' ? value.trim() : '';

export function hasCatalogConfig(env = {}) {
  return Boolean(textValue(env.VITE_CATALOG_API_URL));
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
}

function safePath(value) {
  if (value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  const pathname = value.split(/[?#]/, 1)[0];
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return false; }
  if (/[\\]/.test(decoded) || decoded.startsWith('//') || decoded.split('/').some(part => part === '..' || part === '.')) return false;
  // Encoded separators and repeated encoding must not hide traversal.
  return !/%(?:2e|2f|5c|25)/i.test(pathname);
}

export function validateCatalogApiUrl(url) {
  const value = textValue(url);
  if (!value || /[?#]/.test(value)) throw configurationError();
  if (value.startsWith('/')) {
    if (!safePath(value)) throw configurationError();
    return value;
  }
  const endpoint = httpsUrl(value);
  // Check the original path too: URL itself normalizes dot segments away.
  const originalPath = value.replace(/^https:\/\/[^/]+/i, '') || '/';
  if (!endpoint || !safePath(originalPath)) throw configurationError();
  return value;
}

// Complete photo URLs stay unchanged; repository files use Vite's base path.
export function imageUrl(path, base = '/') {
  const value = textValue(path);
  if (!value) return null;
  if (httpsUrl(value)) return value;
  if (value.includes(':') || !safePath(value)) return null;
  const prefix = typeof base === 'string' && base.startsWith('/') && !base.startsWith('//') ? base : '/';
  return `${prefix.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function normalizeProduct(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw catalogError();
  const id = textValue(row.id);
  const name = textValue(row.name);
  if (!id || !name || !categoryLabels.has(row.category)
    || !Number.isSafeInteger(row.price) || row.price < 0
    || !Number.isSafeInteger(row.stock) || row.stock < 0) throw catalogError();
  if (row.description != null && typeof row.description !== 'string') throw catalogError();
  if (row.badge != null && typeof row.badge !== 'string') throw catalogError();
  const image = row.image == null ? null : textValue(row.image);
  if (image !== null && !(httpsUrl(image) || image.startsWith('/images/') && imageUrl(image))) throw catalogError();
  return {
    id,
    name,
    category: row.category,
    categoryLabel: categoryLabels.get(row.category),
    price: row.price,
    image,
    ...(textValue(row.badge) ? { badge: row.badge.trim() } : {}),
    tone: tones.has(row.tone) ? row.tone : 'mint',
    description: row.description ?? '',
    stock: row.stock,
  };
}

function checkAbort(signal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('La consulta fue cancelada.', 'AbortError');
}

// The API owns the private database connection. No database key is sent here.
export async function loadProducts({ url, signal, fetchImpl = globalThis.fetch } = {}) {
  const endpoint = validateCatalogApiUrl(url);
  try {
    checkAbort(signal);
    const response = await fetchImpl(endpoint, { method: 'GET', cache: 'no-store', signal });
    if (!response.ok) throw catalogError();
    const rows = await response.json();
    checkAbort(signal);
    if (!Array.isArray(rows)) throw catalogError();
    // Older API deployments may still return this retired department.
    // Hide it without rejecting the active catalog or deleting stored records.
    const items = rows.filter(row => row?.category !== 'plush').map(normalizeProduct);
    if (new Set(items.map(({ id }) => id)).size !== items.length) throw catalogError();
    return items;
  } catch (error) {
    checkAbort(signal);
    if (error?.name === 'AbortError') throw error;
    throw catalogError();
  }
}
