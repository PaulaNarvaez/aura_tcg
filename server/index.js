import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createProductReader } from './database.js';

const defaultDist = fileURLToPath(new URL('../dist/', import.meta.url));
const unavailable = () => { throw new Error('Catálogo no configurado.'); };
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function json(response, status, body, extraHeaders = {}) {
  if (response.destroyed || response.writableEnded) return;
  const content = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(content),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(content);
}

function pathnameOf(request) {
  try {
    const pathname = decodeURIComponent((request.url || '/').split('?', 1)[0]);
    if (!pathname.startsWith('/') || pathname.startsWith('//')
      || /[\\\0]/.test(pathname)
      || pathname.split('/').some(part => part === '.' || part === '..')) return null;
    return pathname;
  } catch {
    return null;
  }
}

export function createApp({ readProducts = unavailable, distDir = defaultDist } = {}) {
  const root = resolve(distDir);

  return async function app(request, response) {
    const pathname = pathnameOf(request);
    if (!pathname) { json(response, 404, { error: 'No encontrado.' }); return; }

    if (pathname === '/api/products') {
      if (request.method !== 'GET') {
        json(response, 405, { error: 'Método no permitido.' }, { Allow: 'GET' });
        return;
      }
      try {
        const products = await readProducts();
        if (!Array.isArray(products)) throw new Error('Respuesta de catálogo inválida.');
        json(response, 200, products);
      } catch {
        json(response, 503, { error: 'No pudimos cargar el catálogo.' });
      }
      return;
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      json(response, 404, { error: 'No encontrado.' });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      json(response, 405, { error: 'Método no permitido.' }, { Allow: 'GET, HEAD' });
      return;
    }

    try {
      const realRoot = await realpath(root);
      const file = await realpath(resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`));
      if (!file.startsWith(realRoot + sep)) throw new Error('Ruta fuera de la web.');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('Archivo inexistente.');
      const content = request.method === 'HEAD' ? null : await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(content);
    } catch {
      if (!response.headersSent) json(response, 404, { error: 'No encontrado.' });
      else response.end();
    }
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  let readProducts = unavailable;
  try { readProducts = createProductReader(process.env.DATABASE_URL); }
  catch { console.warn('Configura DATABASE_URL en el servidor para conectar el catálogo de Neon.'); }

  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT debe ser un número entre 1 y 65535.');
    process.exitCode = 1;
  } else {
    const server = createServer(createApp({ readProducts }));
    server.on('error', () => {
      console.error('No pudimos iniciar el servidor. Revisa el puerto y vuelve a intentarlo.');
      process.exitCode = 1;
    });
    server.listen(port, '0.0.0.0', () => console.log(`Pokénova: servidor iniciado en el puerto ${port}.`));
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.once(signal, () => server.close(() => { process.exitCode = 0; }));
    }
  }
}
