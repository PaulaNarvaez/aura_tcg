import { ArrowUpRight, Box, WalletCards } from 'lucide-react';
import { imageUrl } from './catalog-source.js';

const departments = [
  { id: 'cards', label: 'Cartas', title: 'Cartas', description: 'Para jugar y coleccionar' },
  { id: 'sealed', label: 'Sellados y ETB', title: 'Sellados y ETB', description: 'Sobres y cajas selladas' },
  { id: 'plush', label: 'Peluches', title: 'Peluches y figuras', description: 'Tus personajes Pokémon' },
  { id: 'accessories', label: 'Accesorios', title: 'Accesorios', description: 'Para guardar tus cartas' },
];

export function DepartmentsNav({ activeCategory, onSelect }) {
  return <nav className="departments-nav" aria-label="Departamentos de la tienda">
    <div className="container departments-links">
      <button type="button" onClick={() => onSelect('all')} aria-pressed={activeCategory === 'all'}>Toda la tienda</button>
      {departments.map(department => <button
        type="button"
        key={department.id}
        onClick={() => onSelect(department.id)}
        aria-pressed={activeCategory === department.id}
      >{department.label}</button>)}
      <a href="#impresion-3d">Impresión 3D</a>
    </div>
  </nav>;
}

function DepartmentArt({ id }) {
  if (id === 'cards') return <img src={imageUrl('/images/charizard-card.webp', import.meta.env.BASE_URL)} alt="" loading="lazy" />;
  if (id === 'plush') return <img src={imageUrl('/images/eevee.png', import.meta.env.BASE_URL)} alt="" loading="lazy" />;
  if (id === 'sealed') return <span className="shop-module-package"><span className="pokeball"><span /></span><span>TCG</span></span>;
  if (id === 'accessories') return <WalletCards strokeWidth={1.3} />;
  return <Box strokeWidth={1.3} />;
}

function ModuleContents({ id, title, description }) {
  return <>
    <span className="shop-module-visual" aria-hidden="true"><DepartmentArt id={id} /></span>
    <span className="shop-module-copy"><strong>{title}</strong><small>{description}</small></span>
    <ArrowUpRight className="shop-module-arrow" aria-hidden="true" size={20} />
  </>;
}

export default function ShopModules({ onSelect }) {
  return <section className="category-section shop-modules container" aria-labelledby="category-title">
    <div className="section-intro">
      <div><span className="eyebrow">EXPLORA LA TIENDA</span><h2 id="category-title">Compra por categoría.</h2></div>
      <p>Productos Pokémon y piezas 3D a medida.</p>
    </div>
    <div className="shop-module-grid">
      {departments.map(department => <button
        type="button"
        className={`shop-module module-${department.id}`}
        data-department={department.id}
        key={department.id}
        onClick={() => onSelect(department.id)}
      ><ModuleContents {...department} /></button>)}
      <a className="shop-module module-print" data-department="print" href="#impresion-3d">
        <ModuleContents id="print" title="Impresión 3D" description="Cajas, organizadores y soportes" />
      </a>
    </div>
  </section>;
}
