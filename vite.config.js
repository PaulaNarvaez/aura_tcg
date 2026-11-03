import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { hasCatalogConfig, validateCatalogApiUrl } from './src/catalog-source.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (hasCatalogConfig(env)) validateCatalogApiUrl(env.VITE_CATALOG_API_URL);
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  };
});
