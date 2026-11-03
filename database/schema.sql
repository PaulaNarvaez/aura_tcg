-- Ejecutar una vez en el SQL Editor de un proyecto nuevo de Neon.
-- No importa el catálogo de demostración ni modifica tablas existentes.
begin;

create table public.products (
  id text primary key default gen_random_uuid()::text
    check (length(btrim(id)) > 0),
  name text not null check (length(btrim(name)) > 0),
  category text not null
    check (category in ('cards', 'sealed', 'plush', 'accessories')),
  price integer not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image text check (
    image is null
    or image ~ '^https://[^[:space:]]+$'
    or (
      image ~ '^/images/[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and image ~* '\.(avif|gif|jpe?g|png|svg|webp)$'
      and image !~ '/\.\.?(/|$)'
      and image !~ '//'
    )
  ),
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

commit;
