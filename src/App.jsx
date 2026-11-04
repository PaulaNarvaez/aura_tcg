import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, MessageCircle, Minus, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Trash2, X, Zap } from 'lucide-react';
import { categories, filterProducts, formatPrice, products as demoProducts } from './catalog.js';
import { hasCatalogConfig, imageUrl, loadProducts } from './catalog-source.js';
import { addToCart, getCartCount, getCartSubtotal, readCart, removeFromCart, saveCart, updateQuantity } from './cart.js';
import { whatsappUrl } from './site.config.js';
import CustomPrints from './CustomPrints.jsx';
import ShopModules from './ShopModules.jsx';
import CategoriesMenu from './CategoriesMenu.jsx';

const imagePath = (path) => imageUrl(path, import.meta.env.BASE_URL);
const usesDatabase = hasCatalogConfig(import.meta.env);

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}
const backgroundGlints = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  style: {
    '--glint-x': `${((index * 37 + 5) % 95) + 2}%`,
    '--glint-y': `${((index * 23 + 12) % 90) + 5}%`,
    '--glint-size': `${12 + (index % 4) * 3}px`,
    '--glint-delay': `-${((index * 1.7) % 10).toFixed(1)}s`,
    '--glint-duration': `${6 + (index % 5)}s`,
    '--glint-color': ['#8b6dcc', '#52b9d5', '#c887be'][index % 3],
  },
}));

function Pokeball({ className = '' }) {
  return <span aria-hidden="true" className={`pokeball ${className}`}><span /></span>;
}

function getLocalStorage() {
  try { return window.localStorage; } catch { return null; }
}

function ProductArt({ product, className = '' }) {
  if (product.image) return <img className={className} src={imagePath(product.image)} alt={product.name} loading="lazy" />;
  return <div className={`concept-art ${product.name.includes('Sobre') ? 'pack-art' : product.category === 'sealed' ? 'box-art' : 'binder-art'} ${className}`} aria-label={`Ilustración de ${product.name}`} role="img"><Pokeball /><strong>AURA</strong><span>{product.name.includes('Sobre') ? 'BOOSTER PACK' : product.category === 'sealed' ? 'TRAINER COLLECTION' : 'COLLECTOR SERIES'}</span><small>Ilustración referencial</small></div>;
}

function Dialog({ children, onClose, title, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button')?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')).filter(el => !el.disabled && el.offsetParent !== null);
      const first = elements[0];
      const last = elements.at(-1);
      if (!ref.current.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return <div className={`dialog-backdrop ${className}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
      <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={23} /></button></div>
      {children}
    </section>
  </div>;
}

export default function App() {
  const [catalog, setCatalog] = useState(() => ({
    status: usesDatabase ? 'loading' : 'ready',
    products: usesDatabase ? [] : demoProducts,
  }));
  const [loadAttempt, setLoadAttempt] = useState(0);
  const products = catalog.products;
  const catalogReady = catalog.status === 'ready';
  const isDemo = !usesDatabase;
  const [cart, setCart] = useState(() => usesDatabase ? [] : readCart(getLocalStorage(), demoProducts));
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const selected = products.find(product => product.id === selectedId) ?? null;
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [navigationRequest, setNavigationRequest] = useState(null);
  const [sort, setSort] = useState('featured');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const catalogHeadingRef = useRef(null);
  const headerRef = useRef(null);
  const count = getCartCount(cart);
  const subtotal = getCartSubtotal(cart, products);
  const filtered = filterProducts(products, { category, query, sort });
  const activeCategory = categories.find(item => item.id === category) ?? categories[0];
  const catalogTitles = { all: 'Todos los productos', cards: 'Cartas Pokémon', sealed: 'Sellados y ETB', plush: 'Peluches y figuras', accessories: 'Accesorios' };
  const departmentCounts = new Map(categories.map(item => [item.id, filterProducts(products, { category: item.id, query }).length]));

  useLayoutEffect(() => {
    if (!navigationRequest) return;
    const section = document.getElementById(navigationRequest.sectionId);
    if (!section) return;
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - headerHeight - 16);
    // Use the committed layout once; typing never filters or moves the page.
    window.scrollTo({ top, behavior: 'instant' });
    if (navigationRequest.focusHeading) {
      const heading = section.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }, [navigationRequest]);

  useEffect(() => {
    if (!usesDatabase) return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setCatalog({ status: 'loading', products: [] });
    loadProducts({
      url: import.meta.env.VITE_CATALOG_API_URL,
      signal: controller.signal,
    }).then(items => {
      if (cancelled) return;
      // Restore against the current stock only after the database has loaded.
      setCart(readCart(getLocalStorage(), items));
      setCatalog({ status: 'ready', products: items });
    }).catch(() => {
      if (!cancelled) setCatalog({ status: 'error', products: [] });
    }).finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadAttempt]);
  useEffect(() => {
    if (catalogReady) saveCart(getLocalStorage(), cart);
  }, [cart, catalogReady]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const add = (product) => {
    const quantity = cart.find(item => item.productId === product.id)?.quantity ?? 0;
    if (quantity >= product.stock) { setToast({ message: 'Ya agregaste todas las unidades disponibles.' }); return; }
    setCart(previous => addToCart(previous, product.id, product.stock));
    setToast({ message: `${product.name} agregado a tu carrito` });
  };
  const navigateTo = (sectionId, focusHeading = true) => setNavigationRequest({ sectionId, focusHeading });
  const clearSearch = () => {
    setQuery('');
    setDraftQuery('');
    navigateTo('catalogo');
  };
  const chooseCategory = (id) => {
    setCategory(id);
    setQuery('');
    setDraftQuery('');
    setMenuOpen(false);
    navigateTo('catalogo');
  };
  const selectMenuProduct = (product) => {
    setCategory(product.category);
    setQuery(product.name);
    setDraftQuery(product.name);
    setMenuOpen(false);
    navigateTo('catalogo');
  };
  const navigateFromMenu = (sectionId) => {
    setMenuOpen(false);
    navigateTo(sectionId);
  };
  const closeMenu = () => setMenuOpen(false);
  const submitQuickSearch = (event) => {
    event.preventDefault();
    setQuery(draftQuery.trim());
    setCategory('all');
    setMenuOpen(false);
    navigateTo('catalogo', false);
  };
  const consult = (productId) => {
    const next = productId ? removeFromCart(cart, productId) : [];
    saveCart(getLocalStorage(), next);
    setCart(next);
    setSelectedId(null);
    setCartOpen(false);
    setToast(null);
  };
  const orderMessage = `¡Hola, Aura! Quiero consultar disponibilidad y precios de estos productos:\n\n${cart.flatMap(item => { const product = products.find(p => p.id === item.productId); return product ? [`${item.quantity} × ${product.name} (${formatPrice(product.price)} c/u${isDemo ? ', valor de ejemplo' : ''})`] : []; }).join('\n')}\n\n${isDemo ? 'Total de ejemplo' : 'Subtotal'}: ${formatPrice(subtotal)} CLP. ¿Me confirman el valor final y el envío?`;

  return <>
    <div className="animated-background" aria-hidden="true">
      <span className="background-orb orb-yellow" /><span className="background-orb orb-blue" /><span className="background-orb orb-pink" />
      {backgroundGlints.map(glint => <span className="background-glint" key={glint.id} style={glint.style} />)}
      <span className="background-spark spark-a">✦</span><span className="background-spark spark-b">✧</span>
    </div>
    <a className="skip-link" href="#catalogo">Saltar al catálogo</a>
    <div className="announcement"><span><Zap size={13} fill="currentColor" /> Pokémon e impresión 3D a tu medida.</span><span className="announcement-right">POKÉMON. IMPRESIÓN 3D. A MEDIDA. <Sparkles size={13} /></span></div>
    <header className={menuOpen ? 'header categories-open' : 'header'} ref={headerRef}>
      <div className="nav-wrap container">
        <a className="brand" href="#inicio" aria-label="Aura TCG & Print, inicio"><span className="brand-wordmark"><img className="brand-logo" src={imagePath('/images/aura-logo.png')} alt="Aura TCG & Print" /></span></a>
        <nav className="navigation" aria-label="Navegación principal">
          <a href="#impresion-3d" onClick={closeMenu}>Impresión 3D</a>
          <a href="#catalogo" onClick={closeMenu}>Tienda</a>
          <a href="#nosotros" onClick={closeMenu}>Quiénes somos</a>
        </nav>
        <div className="nav-actions">
          <button className="cart-button" onClick={() => { setMenuOpen(false); setToast(null); setCartOpen(true); }} disabled={!catalogReady} aria-label={`Abrir carrito, ${count} productos`}><ShoppingBag size={19} /><span>Mi carrito</span><b>{count}</b></button>
        </div>
      </div>
      <div className="header-search-row container">
      <CategoriesMenu open={menuOpen} onOpenChange={setMenuOpen} activeCategory={category} products={products} isDemo={isDemo} onSelectCategory={chooseCategory} onSelectProduct={selectMenuProduct} onNavigateSection={navigateFromMenu} />
      <form className="quick-search" role="search" aria-label="Búsqueda rápida de productos" onSubmit={submitQuickSearch}>
        <Search size={22} aria-hidden="true" />
        <label className="sr-only" htmlFor="quick-search">Buscar productos</label>
        <input id="quick-search" type="search" value={draftQuery} onChange={event => setDraftQuery(event.target.value)} placeholder="Busca cartas, peluches, ETB…" />
        <button className="quick-search-button" type="submit">Buscar <ArrowRight size={18} /></button>
      </form>
      </div>
    </header>

    <main>
      <section className="hero hero-custom hero-aura container" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">AURA TCG & PRINT</span>
          <h1>Pokémon +<br />{' '}impresión 3D<br />{' '}<span className="collection-word">a tu medida<svg viewBox="0 0 440 25" aria-hidden="true"><path d="M4 17C90 1 325 0 435 13M14 22C148 9 303 9 409 21" /></svg></span>.</h1>
          <p>Productos Pokémon y accesorios impresos en 3D para organizar, guardar y cuidar tus cartas. Diseñamos contigo según tu colección y tus medidas.</p>
          <div className="hero-buttons"><a href="#impresion-3d" className="button button-dark">Cotizar impresión 3D <ArrowUpRight size={19} /></a><a href="#catalogo" className="text-link">Ver productos Pokémon <span><ArrowRight size={17} /></span></a></div>
          <div className="hero-note"><span className="tiny-avatars"><img src={imagePath('/images/eevee.png')} alt="" /><img src={imagePath('/images/gengar.png')} alt="" /><img src={imagePath('/images/lucario.png')} alt="" /></span><span>Para tus cartas.<br />{' '}<strong>Para tu forma de coleccionar.</strong></span><Heart size={18} className="small-heart" /></div>
        </div>
        <div className="hero-art" aria-label="Lucario entre estrellas y tonos azules y violetas de Aura" role="img">
          <div className="hero-grid" /><span className="hero-art-label">EL AURA DE TU COLECCIÓN</span><span className="hero-outline">AURA</span>
          <div className="orbital orbital-one" /><div className="orbital orbital-two" />
          <Sparkles className="hero-spark spark-one" size={39} strokeWidth={1.4} /><Star className="hero-spark spark-two" size={25} strokeWidth={1.5} />
          <img className="hero-mascot" src={imagePath('/images/lucario-hero.png')} alt="" fetchPriority="high" />
          <div className="floating-card aura-collector-card"><div className="aura-card-heading"><span>AURA</span><Sparkles size={11} /></div><img src={imagePath('/images/lucario.png')} alt="" /><span>ILUSTRACIÓN REFERENCIAL</span></div>
          <div className="hero-sticker"><Sparkles size={23} /><span>TCG<br />{' '}<b>& PRINT</b></span></div>
          <div className="hero-art-footer"><span>CARTAS, IDEAS Y UN POCO DE AURA.</span><ArrowDown size={19} /></div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, i) => <span key={i}>POKÉMON + IMPRESIÓN 3D <Sparkles size={18} /> ACCESORIOS A MEDIDA <Pokeball /> ORGANIZA TU COLECCIÓN <Star size={18} /></span>)}</div></div>

      <ShopModules onSelect={chooseCategory} />

      <section className="catalog-section container" id="catalogo" aria-labelledby="catalog-title">
        <nav className="catalog-breadcrumb" aria-label="Ruta del catálogo"><button type="button" onClick={() => scrollToSection('inicio')}>Inicio</button><span aria-hidden="true">/</span><button type="button" onClick={() => chooseCategory('all')}>Tienda</button>{category !== 'all' && <><span aria-hidden="true">/</span><span aria-current="page">{activeCategory.label}</span></>}</nav>
        <div className="section-intro"><div><span className="eyebrow">TIENDA AURA</span><h2 id="catalog-title" ref={catalogHeadingRef} tabIndex={-1}>{catalogTitles[category] ?? activeCategory.label}<span className="heading-dot">.</span></h2></div><span className="catalog-label">{isDemo ? 'CATÁLOGO DE MUESTRA' : 'CATÁLOGO AURA'}</span></div>
        <p className="demo-notice">{isDemo ? 'Estamos preparando la tienda. Precios y existencias de ejemplo, con imágenes referenciales; consulta los valores vigentes por WhatsApp.' : 'Consulta la disponibilidad, el valor final y el envío por WhatsApp.'}</p>
        <div className="catalog-layout">
          <aside className="catalog-sidebar" aria-labelledby="catalog-departments-title">
            <h3 id="catalog-departments-title">Categorías</h3>
            <div className="filter-tabs" aria-label="Categorías de productos">{categories.map(item => <button type="button" key={item.id} onClick={() => setCategory(item.id)} aria-label={item.label} aria-pressed={category === item.id} className={category === item.id ? 'active' : ''}><span>{item.label}</span>{catalogReady && <span className="department-count" aria-hidden="true">{departmentCounts.get(item.id)}</span>}</button>)}</div>
            <a className="sidebar-custom-print" href="#impresion-3d"><Sparkles size={18} /> Impresión 3D a medida <ArrowUpRight size={16} /></a>
          </aside>
          <div className="catalog-content">
            <div className="catalog-toolbar">
              <div className="catalog-summary">
                {catalogReady && <p className="result-count" id="catalog-results" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}</p>}
                {query.trim() && <div className="catalog-current-search"><p>Resultados para <strong>“{query.trim()}”</strong></p><button className="clear-search" type="button" onClick={clearSearch} aria-label="Quitar búsqueda"><X size={16} aria-hidden="true" /> Quitar búsqueda</button></div>}
              </div>
              <label className="sort-field"><span className="sr-only">Ordenar productos</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select><ChevronDown size={14} /></label>
            </div>
        {catalog.status === 'loading' && <div className="catalog-status" role="status"><Sparkles size={25} /><p>Cargando productos…</p></div>}
        {catalog.status === 'error' && <div className="catalog-status" role="alert"><p>No pudimos cargar el catálogo.</p><span>Puedes intentarlo otra vez o consultar los productos por WhatsApp.</span><button className="button button-dark" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Reintentar <ArrowRight size={16} /></button></div>}
        <div className="product-grid" aria-busy={catalog.status === 'loading'}>{filtered.map(product => <article className="product-card" key={product.id}>
          <button className={`product-image tone-${product.tone}`} onClick={() => setSelectedId(product.id)} aria-label={`Ver detalles de ${product.name}`}>
            {product.badge && <span className="product-badge">{product.badge === 'Favorito' && <Star size={11} fill="currentColor" />} {product.badge}</span>}
            <ProductArt product={product} /><span className="view-product">Ver de cerca <ArrowUpRight size={14} /></span>
          </button>
          <div className="product-info"><span className="product-category">{product.categoryLabel}</span><button className="product-name" onClick={() => setSelectedId(product.id)}>{product.name}</button><div className="product-bottom"><div><strong>{formatPrice(product.price)} <small>CLP</small></strong><span>{product.stock === 0 ? 'Agotado' : isDemo ? 'Precio de ejemplo' : 'Precio en CLP'}</span></div><button className="add-button" onClick={() => add(product)} disabled={product.stock === 0} aria-label={`Agregar ${product.name} al carrito`}><Plus size={20} /></button></div></div>
        </article>)}</div>
        {catalogReady && filtered.length === 0 && <div className="empty-search"><Search size={32} /><h3>{products.length === 0 ? 'Estamos preparando nuevos productos.' : 'Ese Pokémon se nos escondió.'}</h3><p>{products.length === 0 ? 'Mientras tanto, puedes consultar por WhatsApp o cotizar una impresión 3D.' : 'Prueba otra búsqueda o explora todas las categorías.'}</p>{products.length > 0 && <button className="button button-dark" onClick={() => chooseCategory('all')}>Ver todos los productos <ArrowRight size={16} /></button>}</div>}
          </div>
        </div>
        <div className="catalog-bottom"><span><MessageCircle size={17} /> ¿Quieres un accesorio con tus medidas? Cuéntanos tu idea.</span><a href={whatsappUrl('¡Hola, Aura! Quisiera consultar por un producto Pokémon o un accesorio de impresión 3D a medida.')} target="_blank" rel="noreferrer">Hablemos por WhatsApp <ArrowUpRight size={17} /></a></div>
      </section>

      <CustomPrints />

      <section className="about-section container" id="nosotros" aria-labelledby="about-title">
        <div className="about-art"><div className="about-outline">TCG<br />{' '}+ 3D.</div><img src={imagePath('/images/gengar.png')} alt="Gengar" loading="lazy" /><div className="about-badge"><Heart size={23} /><span>DE FANS<br />{' '}<strong>PARA FANS</strong></span></div><Sparkles size={34} className="about-spark" /></div>
        <div className="about-copy"><span className="eyebrow">HOLA, SOMOS AURA <span className="wave" aria-hidden="true">✌️</span></span><h2>Pokémon y diseño<br />{' '}pensados para<br />{' '}<span>tu colección.</span></h2><p>Nos gustan Pokémon y las colecciones bien cuidadas. Por eso reunimos productos TCG y accesorios hechos con impresión 3D a medida.</p><p>Creamos cajas, organizadores y soportes según el formato de tus cartas y sus fundas. Conversemos sobre tus medidas, colores e ideas para definir una pieza que se adapte a ti.</p><a className="text-link" href={whatsappUrl('¡Hola, Aura! Me gustaría conocer más sobre la tienda.')} target="_blank" rel="noreferrer">Conversemos de Pokémon <span><ArrowUpRight size={17} /></span></a></div>
      </section>

      <section className="contact-banner container"><div><span className="eyebrow">TÚ PREGUNTA. NOSOTROS TE AYUDAMOS.</span><h2>¿Una duda? <span>¡Te leemos!</span><span className="chat-emoji" aria-hidden="true">💬</span></h2><p>Consulta por productos Pokémon o cuéntanos qué pieza 3D necesitas.</p></div><a className="button button-dark" href={whatsappUrl('¡Hola, Aura! Quisiera consultar por productos Pokémon o cotizar una pieza de impresión 3D a medida.')} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Escríbenos por WhatsApp <ArrowUpRight size={18} /></a></section>
    </main>

    <footer className="footer"><div className="container footer-top"><a className="brand" href="#inicio"><img className="brand-logo" src={imagePath('/images/aura-logo.png')} alt="Aura TCG & Print" /></a><p>Pokémon e impresión 3D.<br />{' '}Accesorios a tu medida.</p><div className="footer-links"><a href="#impresion-3d">Impresión 3D</a><a href="#catalogo">La tienda</a><a href="#nosotros">Nuestra historia</a><a href={whatsappUrl('¡Hola, Aura! Quisiera hacer una consulta.')} target="_blank" rel="noreferrer">Contacto <ArrowUpRight size={13} /></a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Aura TCG & Print.<span className="footer-credit">Creado por <strong>paujnarvaez</strong> con <span className="credit-heart" role="img" aria-label="amor">♥</span></span></span><span className="footer-legal">Todos los derechos reservados sobre el contenido propio de Aura. Las marcas, personajes e imágenes de Pokémon pertenecen a sus respectivos titulares. Aura TCG & Print es una tienda independiente, sin afiliación oficial con Pokémon.</span></div></footer>
    <a className="floating-whatsapp" href={whatsappUrl('¡Hola, Aura! Quisiera consultar por Pokémon o impresión 3D a medida.')} target="_blank" rel="noreferrer" aria-label="Consultar precios por WhatsApp"><MessageCircle size={25} /><span>¿Hablamos?</span><span className="whatsapp-dot" /></a>
    <div className={toast ? 'toast visible' : 'toast'} role="status" aria-live="polite">{toast && <><span><Check size={17} /></span>{toast.message}<button className="icon-button" aria-label="Cerrar aviso" onClick={() => setToast(null)}><X size={16} /></button></>}</div>

    {selected && <Dialog onClose={() => setSelectedId(null)} title="Un favorito de cerca" className="product-dialog"><div className={`detail-art tone-${selected.tone}`}><ProductArt product={selected} /></div><span className="eyebrow">{selected.categoryLabel}</span><h3>{selected.name}</h3><p>{selected.description}</p><div className="detail-price"><strong>{formatPrice(selected.price)} CLP</strong><span>{isDemo ? 'Precio de ejemplo · Consulta el valor vigente.' : selected.stock === 0 ? 'Agotado · Consulta por disponibilidad.' : 'Consulta la disponibilidad y el envío.'}</span></div>{isDemo && selected.category === 'plush' && <p className="image-disclaimer">Imagen del personaje como referencia; no representa una fotografía del peluche disponible.</p>}<div className="detail-actions"><button className="button button-dark" onClick={() => add(selected)} disabled={selected.stock === 0}><ShoppingBag size={18} /> Agregar al carrito</button><a className="button button-outline" href={whatsappUrl(`¡Hola, Aura! Quisiera consultar el precio y disponibilidad de ${selected.name}.`)} onClick={() => consult(selected.id)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar precio</a></div></Dialog>}

    {cartOpen && <Dialog onClose={() => setCartOpen(false)} title={`Tu colección (${count})`} className="cart-dialog">
      <p className="cart-note">Arma tu consulta. El carrito se vacía al abrir el pedido en WhatsApp.</p>
      {cart.length === 0 ? <div className="cart-empty"><div><ShoppingBag size={43} strokeWidth={1.3} /><Sparkles size={21} /></div><h3>Una aventura por llenar.</h3><p>Tu próxima colección comienza<br />{' '}con un pequeño favorito.</p><button className="button button-dark" onClick={() => { setCartOpen(false); scrollToSection('catalogo'); }}>Explorar la tienda <ArrowRight size={17} /></button></div> : <><div className="cart-items">{cart.map(item => { const product = products.find(p => p.id === item.productId); if (!product) return null; return <article className="cart-item" key={item.productId}><div className={`cart-item-art tone-${product.tone}`}><ProductArt product={product} /></div><div className="cart-item-info"><span>{product.categoryLabel}</span><h3>{product.name}</h3><strong>{formatPrice(product.price)} CLP</strong><div className="quantity-controls"><button aria-label={`Reducir cantidad de ${product.name}`} onClick={() => setCart(previous => updateQuantity(previous, product.id, item.quantity - 1, product.stock))}><Minus size={13} /></button><span aria-label={`Cantidad: ${item.quantity}`}>{item.quantity}</span><button aria-label={`Aumentar cantidad de ${product.name}`} disabled={item.quantity >= product.stock} onClick={() => setCart(previous => updateQuantity(previous, product.id, item.quantity + 1, product.stock))}><Plus size={13} /></button></div></div><button className="remove-item icon-button" aria-label={`Eliminar ${product.name}`} onClick={() => setCart(previous => removeFromCart(previous, product.id))}><Trash2 size={17} /></button></article>; })}</div><div className="cart-summary"><div><span>{isDemo ? 'Subtotal de ejemplo' : 'Subtotal'}</span><strong>{formatPrice(subtotal)} CLP</strong></div><p>{isDemo ? 'Los precios y el stock son demostrativos. El valor final, la disponibilidad y el envío se confirman por WhatsApp.' : 'El valor final, la disponibilidad y el envío se confirman por WhatsApp.'}</p><a className="button button-dark" href={whatsappUrl(orderMessage)} onClick={() => consult()} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Consultar mi pedido <ArrowUpRight size={17} /></a><span className="cart-checkout-note"><ShieldCheck size={14} /> Esta consulta no realiza un pago ni reserva productos.</span></div></>}
    </Dialog>}
  </>;
}
