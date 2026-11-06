export const categories = [
  { id: 'all', label: 'Ver todo' },
  { id: 'cards', label: 'Cartas' },
  { id: 'sealed', label: 'Sellados & ETB' },
  { id: 'accessories', label: 'Accesorios' },
];

// Catálogo y precios de demostración. No representan inventario disponible.
export const products = [
  {
    id: 'charizard-card',
    name: 'Charizard ex · Obsidian Flames',
    category: 'cards',
    categoryLabel: 'Cartas',
    price: 39990,
    image: '/images/charizard-card.webp',
    badge: 'Para tu colección',
    tone: 'orange',
    description: 'Carta Charizard ex #223 de Obsidian Flames. Imagen de referencia; precio e inventario de demostración.',
    stock: 4,
  },
  {
    id: 'elite-trainer-box',
    name: 'ETB Escarlata y Púrpura',
    category: 'sealed',
    categoryLabel: 'Sellados & ETB',
    price: 59990,
    image: null,
    badge: 'Destacado',
    tone: 'purple',
    description: 'Una Elite Trainer Box para abrir sobres y preparar tu próxima partida. Presentación conceptual; precio e inventario de demostración.',
    stock: 6,
  },
  {
    id: 'booster-pack',
    name: 'Sobre Pokémon TCG',
    category: 'sealed',
    categoryLabel: 'Sellados & ETB',
    price: 5990,
    image: null,
    tone: 'blue',
    description: 'Un sobre para descubrir tu próxima carta favorita. Presentación conceptual; precio e inventario de demostración.',
    stock: 30,
  },
  {
    id: 'pikachu-card',
    name: 'Pikachu · Silver Tempest',
    category: 'cards',
    categoryLabel: 'Cartas',
    price: 14990,
    image: '/images/pikachu-card.webp',
    tone: 'yellow',
    description: 'Carta Pikachu #49 de Silver Tempest. Imagen de referencia; precio e inventario de demostración.',
    stock: 10,
  },
  {
    id: 'pikachu-keyring',
    name: 'Llavero Pikachu',
    category: 'accessories',
    categoryLabel: 'Accesorios',
    price: 7990,
    image: '/images/pikachu.png',
    tone: 'mint',
    description: 'Un pequeño toque Pokémon para tus llaves o mochila. Imagen referencial.',
    stock: 15,
  },
];

const currency = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function formatPrice(price) {
  return currency.format(price);
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .trim();
}

export function filterProducts(items, { category = 'all', query = '', sort = 'featured' } = {}) {
  const search = normalizeText(query);
  const filtered = items.filter((product) => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesSearch = !search || normalizeText(
      `${product.name} ${product.categoryLabel} ${product.description}`,
    ).includes(search);
    return matchesCategory && matchesSearch;
  });

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  return filtered;
}
