import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { hasSupabaseConfig, validateSupabaseConfig } from './src/catalog-source.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Reject privileged credentials before Vite can put them in browser files.
  if (hasSupabaseConfig(env)) {
    try {
      validateSupabaseConfig({ url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY });
    } catch {
      throw new Error('Revisa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY: configura ambas y usa solo una clave pública publishable o anon.');
    }
  }
  return { plugins: [react()], base: env.VITE_BASE_PATH || '/' };
});
