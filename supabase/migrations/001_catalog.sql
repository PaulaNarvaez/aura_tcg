-- Ejecutar una vez en un proyecto nuevo de Supabase, desde SQL Editor.
-- No carga productos ni precios de demostración.
begin;

create table public.products (
  id text primary key default gen_random_uuid()::text
    check (length(btrim(id)) > 0),
  name text not null check (length(btrim(name)) > 0),
  category text not null
    check (category in ('cards', 'sealed', 'plush', 'accessories')),
  price integer not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image text check (image is null or image ~ '^https://[^[:space:]]+$'),
  badge text,
  tone text not null default 'mint'
    check (tone in ('yellow', 'orange', 'purple', 'peach', 'blue', 'mint')),
  description text not null default '',
  is_published boolean not null default false,
  sort_order integer not null default 0
);

create index products_published_order_idx
  on public.products (sort_order, id)
  where is_published;

alter table public.products enable row level security;

-- Las visitas pueden leer el catálogo publicado, sin modificar inventario.
revoke all on table public.products from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.products to anon, authenticated;

create policy "Leer productos publicados"
  on public.products
  for select
  to anon, authenticated
  using (is_published = true);

-- Las fotografías son públicas. La carga se realiza desde el dashboard;
-- no se habilitan permisos de subida para visitantes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
);

commit;
