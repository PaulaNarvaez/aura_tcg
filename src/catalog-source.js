import { categories } from './catalog.js';

const PAGE_SIZE = 1000;
const columns = 'id,name,category,price,image,badge,tone,description,stock';
const categoryLabels = new Map(categories.filter(({ id }) => id !== 'all').map(({ id, label }) => [id, label]));
const tones = new Set(['yellow', 'orange', 'purple', 'peach', 'blue', 'mint']);
const configurationError = () => new Error('Revisa la configuración pública del catálogo.');
const catalogError = () => new Error('No pudimos cargar el catálogo. Inténtalo nuevamente.');
const textValue = value => typeof value === 'string' ? value.trim() : '';

// A partial configuration must report an error rather than showing demo stock.
export function hasSupabaseConfig(env = {}) {
  return Boolean(textValue(env.VITE_SUPABASE_URL) || textValue(env.VITE_SUPABASE_PUBLISHABLE_KEY));
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim() || !/^https:\/\//i.test(value.trim())) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
}

// Storage photos already have a complete URL. Bundled images need Vite's base.
export function imageUrl(path, base = '/') {
  if (typeof path !== 'string' || !path.trim()) return null;
  const value = path.trim();
  if (httpsUrl(value)) return value;
  if (value.startsWith('//') || /[\\:]/.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0];
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (/[\\]/.test(decoded) || decoded.startsWith('//') || decoded.split('/').some(part => part === '..' || part === '.')) return null;
  // Encoded separators or a second decoding step must not hide traversal.
  if (/%(?:2e|2f|5c|25)/i.test(pathname)) return null;
  const prefix = typeof base === 'string' && base.startsWith('/') && !base.startsWith('//') ? base : '/';
  return `${prefix.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function keyKind(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return 'publishable';
  const segments = key.split('.');
  if (segments.length !== 3 || segments.some(segment => !/^[A-Za-z0-9_-]+$/.test(segment))) throw configurationError();
  try {
    const payload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    if (claims?.role === 'anon') return 'anon';
  } catch {
    // Never include the key or backend response in a displayed error.
  }
  throw configurationError();
}

// Vite also calls this before serving or bundling, so a privileged key cannot
// accidentally become part of the public application bundle.
export function validateSupabaseConfig({ url, key } = {}) {
  const endpoint = httpsUrl(url);
  if (!endpoint || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) throw configurationError();
  const publicKey = textValue(key);
  return { endpoint, publicKey, kind: keyKind(publicKey) };
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
  if (row.image != null && !httpsUrl(row.image)) throw catalogError();
  return {
    id,
    name,
    category: row.category,
    categoryLabel: categoryLabels.get(row.category),
    price: row.price,
    image: row.image == null ? null : row.image.trim(),
    ...(textValue(row.badge) ? { badge: row.badge.trim() } : {}),
    tone: tones.has(row.tone) ? row.tone : 'mint',
    description: row.description ?? '',
    stock: row.stock,
  };
}

function checkAbort(signal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('La consulta fue cancelada.', 'AbortError');
}

export async function loadProducts({ url, key, signal, fetchImpl = globalThis.fetch } = {}) {
  const { endpoint, publicKey, kind } = validateSupabaseConfig({ url, key });
  const headers = { apikey: publicKey, Prefer: 'count=exact' };
  if (kind === 'anon') headers.Authorization = `Bearer ${publicKey}`;
  const items = [];
  const ids = new Set();
  let offset = 0;

  try {
    while (true) {
      checkAbort(signal);
      const requestUrl = new URL('/rest/v1/products', endpoint);
      requestUrl.search = new URLSearchParams({
        select: columns,
        is_published: 'eq.true',
        order: 'sort_order.asc,id.asc',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      }).toString();
      const response = await fetchImpl(requestUrl.href, { headers, signal });
      if (!response.ok) throw catalogError();
      const rows = await response.json();
      checkAbort(signal);
      if (!Array.isArray(rows)) throw catalogError();
      for (const row of rows) {
        const product = normalizeProduct(row);
        if (ids.has(product.id)) throw catalogError();
        ids.add(product.id);
        items.push(product);
      }
      offset += rows.length;
      const range = response.headers?.get('content-range');
      const match = typeof range === 'string' ? range.match(/^(?:\d+-\d+|\*)\/(\d+)$/) : null;
      const total = match ? Number(match[1]) : null;
      if (total !== null && (!Number.isSafeInteger(total) || total < offset)) throw catalogError();
      if (rows.length === 0) {
        if (total !== null && offset < total) throw catalogError();
        return items;
      }
      if (total !== null ? offset >= total : rows.length < PAGE_SIZE) return items;
    }
  } catch (error) {
    checkAbort(signal);
    if (error?.name === 'AbortError') throw error;
    throw catalogError();
  }
}
