import { neon } from '@neondatabase/serverless';

const configurationError = () => new Error('Configura DATABASE_URL con la conexión privada de Neon.');

export function createProductReader(connectionString) {
  try {
    const connection = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(connection.protocol)
      || !connection.hostname || connection.pathname.length < 2) throw configurationError();
  } catch {
    throw configurationError();
  }

  let sql;
  try { sql = neon(connectionString); } catch { throw configurationError(); }

  return () => sql.query(`
    SELECT id, name, category, price, image, badge, tone, description, stock
    FROM public.products
    WHERE is_published = true
      AND category IN ('cards', 'sealed', 'accessories')
    ORDER BY sort_order, id
  `, [], { fetchOptions: { signal: AbortSignal.timeout(10_000) } });
}
