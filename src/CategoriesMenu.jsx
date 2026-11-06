import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Box, ChevronDown, Layers, LayoutGrid, Menu, Package, WalletCards, X } from 'lucide-react';
import { shopDepartments } from './ShopModules.jsx';
import { whatsappUrl } from './site.config.js';

const departmentIcons = { cards: Layers, sealed: Package, accessories: WalletCards };
const validPreview = id => shopDepartments.some(department => department.id === id) ? id : 'all';

export default function CategoriesMenu({ open, onOpenChange, activeCategory, products = [], isDemo, onSelectCategory, onSelectProduct, onNavigateSection }) {
  const panelId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [preview, setPreview] = useState(() => validPreview(activeCategory));
  const [menuStyle, setMenuStyle] = useState({});
  const department = shopDepartments.find(item => item.id === preview);
  const categoryProducts = department ? products.filter(product => product.category === department.id).slice(0, 4) : [];

  useEffect(() => {
    if (open) setPreview(validPreview(activeCategory));
  }, [open, activeCategory]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const row = trigger?.closest('.header-search-row') ?? menuRef.current;
      const header = trigger?.closest('header');
      if (!row || !header) return;
      const panelTop = `${Math.ceil(row.getBoundingClientRect().bottom + 10)}px`;
      const backdropTop = `${Math.ceil(header.getBoundingClientRect().bottom)}px`;
      setMenuStyle(previous => previous['--categories-panel-top'] === panelTop && previous['--categories-backdrop-top'] === backdropTop
        ? previous : { '--categories-panel-top': panelTop, '--categories-backdrop-top': backdropTop });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [open]);

  const dismissMenu = useCallback(() => {
    onOpenChange(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      dismissMenu();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, dismissMenu]);

  const previewButton = (id, label, Icon, onClick) => <button
    key={id}
    type="button"
    aria-pressed={preview === id}
    onMouseEnter={() => setPreview(id)}
    onFocus={() => setPreview(id)}
    onClick={onClick}
  ><Icon size={21} aria-hidden="true" /><span>{label}</span><ArrowRight size={16} aria-hidden="true" /></button>;

  return <div className="categories-menu" ref={menuRef} style={menuStyle} onBlur={event => {
    if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) onOpenChange(false);
  }}>
    <button className="categories-trigger" type="button" ref={triggerRef}
      aria-label={open ? 'Cerrar menú de categorías' : 'Abrir menú de categorías'}
      aria-expanded={open} aria-controls={panelId} onClick={() => onOpenChange(!open)}>
      <Menu size={24} aria-hidden="true" /><span>Categorías</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {open && <>
      <button className="categories-backdrop" type="button" tabIndex={-1} aria-label="Cerrar categorías" onClick={dismissMenu} />
      <section className="categories-panel" id={panelId} role="region" aria-label="Menú de categorías">
        <div className="categories-panel-heading"><h2>Explora Aura</h2><button className="icon-button" type="button" aria-label="Cerrar menú" onClick={dismissMenu}><X size={22} aria-hidden="true" /></button></div>
        <div className="categories-menu-body">
          <nav className="categories-menu-list" aria-label="Categorías de la tienda">
            {previewButton('all', 'Ver toda la tienda', LayoutGrid, () => onSelectCategory('all'))}
            {shopDepartments.map(item => previewButton(item.id, item.label, departmentIcons[item.id], () => onSelectCategory(item.id)))}
            {previewButton('print', 'Impresión 3D', Box, () => onNavigateSection('impresion-3d'))}
          </nav>
          <div className="categories-menu-content">
            {preview === 'all' && <>
              <h3>Compra por categoría</h3>
              <div className="categories-grid">{shopDepartments.map(item => {
                const Icon = departmentIcons[item.id];
                return <button className="category-menu-tile" type="button" key={item.id} onClick={() => onSelectCategory(item.id)}>
                  <Icon size={27} aria-hidden="true" /><strong>{item.title}</strong><small>{item.description}</small>
                </button>;
              })}</div>
              <button className="categories-print-callout" type="button" onClick={() => onNavigateSection('impresion-3d')}><Box size={25} aria-hidden="true" /><span><strong>Impresión 3D a tu medida</strong><small>Cajas, organizadores y soportes</small></span><ArrowRight size={20} aria-hidden="true" /></button>
            </>}
            {department && <>
              <h3>{department.title}</h3><p>{department.description}</p>
              <button className="categories-view-all" type="button" onClick={() => onSelectCategory(department.id)}>Ver categoría <ArrowRight size={18} aria-hidden="true" /></button>
              <div className="categories-products"><h4>{isDemo ? 'Ejemplos del catálogo' : 'En el catálogo'}</h4>
                {categoryProducts.length > 0 ? categoryProducts.map(product => <button className="category-product-item" type="button" key={product.id} onClick={() => onSelectProduct(product)}><span>{product.name}</span><ArrowRight size={17} aria-hidden="true" /></button>) : <p>Explora la categoría o consulta por WhatsApp.</p>}
              </div>
            </>}
            {preview === 'print' && <>
              <h3>Impresión 3D a medida</h3><p>Cuéntanos cómo quieres organizar y guardar tus cartas.</p>
              <ul className="categories-services"><li>Cajas para mazos</li><li>Organizadores</li><li>Soportes para cartas</li></ul>
              <button className="categories-view-all" type="button" onClick={() => onNavigateSection('impresion-3d')}>Cotizar impresión 3D <ArrowRight size={18} aria-hidden="true" /></button>
            </>}
          </div>
        </div>
        <div className="categories-panel-footer"><button type="button" onClick={() => onNavigateSection('nosotros')}>Quiénes somos</button><a href={whatsappUrl('¡Hola, Aura! Quisiera consultar por productos Pokémon o impresión 3D a medida.')} target="_blank" rel="noreferrer" onClick={() => onOpenChange(false)}>Contacto por WhatsApp <ArrowRight size={16} aria-hidden="true" /></a></div>
      </section>
    </>}
  </div>;
}
