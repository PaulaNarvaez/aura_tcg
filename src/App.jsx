import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Box, ArrowUpRight, Check, ChevronDown, Heart, Menu, MessageCircle, Minus, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Trash2, X, Zap } from 'lucide-react';
import { categories, filterProducts, formatPrice, products as demoProducts } from './catalog.js';
import { hasSupabaseConfig, imageUrl, loadProducts } from './catalog-source.js';
import { addToCart, getCartCount, getCartSubtotal, readCart, removeFromCart, saveCart, updateQuantity } from './cart.js';
import { whatsappUrl } from './site.config.js';
import Buyback from './Buyback.jsx';
import CustomPrints from './CustomPrints.jsx';

const imagePath = (path) => imageUrl(path, import.meta.env.BASE_URL);
const usesDatabase = hasSupabaseConfig(import.meta.env);
const backgroundGlints = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  style: {
    '--glint-x': `${((index * 37 + 5) % 95) + 2}%`,
    '--glint-y': `${((index * 23 + 12) % 90) + 5}%`,
    '--glint-size': `${12 + (index % 4) * 3}px`,
    '--glint-delay': `-${((index * 1.7) % 10).toFixed(1)}s`,
    '--glint-duration': `${6 + (index % 5)}s`,
    '--glint-color': ['#c49a32', '#7298cf', '#bc88a4'][index % 3],
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
  return <div className={`concept-art ${product.name.includes('Sobre') ? 'pack-art' : product.category === 'sealed' ? 'box-art' : 'binder-art'} ${className}`} aria-label={`Ilustración de ${product.name}`} role="img"><Pokeball /><strong>POKÉNOVA</strong><span>{product.name.includes('Sobre') ? 'BOOSTER PACK' : product.category === 'sealed' ? 'TRAINER COLLECTION' : 'COLLECTOR SERIES'}</span><small>Ilustración referencial</small></div>;
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
      previousFocus?.focus();
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
  const [sort, setSort] = useState('featured');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);
  const count = getCartCount(cart);
  const subtotal = getCartSubtotal(cart, products);
  const filtered = filterProducts(products, { category, query, sort });

  useEffect(() => {
    if (!usesDatabase) return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setCatalog({ status: 'loading', products: [] });
    loadProducts({
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
  const chooseCategory = (id) => { setCategory(id); setQuery(''); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }); };
  const closeMenu = () => setMenuOpen(false);
  const consult = (productId) => {
    const next = productId ? removeFromCart(cart, productId) : [];
    saveCart(getLocalStorage(), next);
    setCart(next);
    setSelectedId(null);
    setCartOpen(false);
    setToast(null);
  };
  const orderMessage = `¡Hola, Pokenova! Quiero consultar disponibilidad y precios de estos productos:\n\n${cart.flatMap(item => { const product = products.find(p => p.id === item.productId); return product ? [`${item.quantity} × ${product.name} (${formatPrice(product.price)} c/u${isDemo ? ', valor de ejemplo' : ''})`] : []; }).join('\n')}\n\n${isDemo ? 'Total de ejemplo' : 'Subtotal'}: ${formatPrice(subtotal)} CLP. ¿Me confirman el valor final y el envío?`;

  return <>
    <div className="animated-background" aria-hidden="true">
      <span className="background-orb orb-yellow" /><span className="background-orb orb-blue" /><span className="background-orb orb-pink" />
      {backgroundGlints.map(glint => <span className="background-glint" key={glint.id} style={glint.style} />)}
      <span className="background-spark spark-a">✦</span><span className="background-spark spark-b">✧</span>
    </div>
    <a className="skip-link" href="#catalogo">Saltar al catálogo</a>
    <div className="announcement"><span><Zap size={13} fill="currentColor" /> Pokémon e impresión 3D a tu medida.</span><span className="announcement-right">POKÉMON. IMPRESIÓN 3D. A MEDIDA. <Sparkles size={13} /></span></div>
    <header className="header">
      <div className="nav-wrap container">
        <a className="brand" href="#inicio" aria-label="Pokenova TCG, inicio"><img className="brand-symbol" src={imagePath('/favicon.svg?version=2')} alt="" /><span>pokénova<span className="brand-tcg">TCG & 3D</span></span></a>
        <nav className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Navegación principal">
          <a href="#impresion-3d" onClick={closeMenu}>Impresión 3D</a>
          <a href="#catalogo" onClick={closeMenu}>Explorar tienda <ChevronDown size={12} /></a>
          <a href="#compramos" onClick={closeMenu}>Compramos tus cartas</a>
          <a href="#nosotros" onClick={closeMenu}>Quiénes somos</a>
        </nav>
        <div className="nav-actions">
          <button className="icon-button search-nav" aria-label="Buscar productos" onClick={() => { document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }); searchRef.current?.focus({ preventScroll: true }); }}><Search size={21} /></button>
          <button className="cart-button" onClick={() => setCartOpen(true)} disabled={!catalogReady} aria-label={`Abrir carrito, ${count} productos`}><ShoppingBag size={19} /><span>Mi carrito</span><b>{count}</b></button>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>

    <main>
      <section className="hero hero-custom container" id="inicio">
        <div className="hero-copy">
          <h1>Pokémon +<br />{' '}impresión 3D<br />{' '}<span className="collection-word">a tu medida<svg viewBox="0 0 440 25" aria-hidden="true"><path d="M4 17C90 1 325 0 435 13M14 22C148 9 303 9 409 21" /></svg></span>.</h1>
          <p>Productos Pokémon y accesorios impresos en 3D para organizar, guardar y cuidar tus cartas. Diseñamos contigo según tu colección y tus medidas.</p>
          <div className="hero-buttons"><a href="#impresion-3d" className="button button-dark">Cotizar impresión 3D <ArrowUpRight size={19} /></a><a href="#catalogo" className="text-link">Ver productos Pokémon <span><ArrowRight size={17} /></span></a></div>
          <div className="hero-note"><span className="tiny-avatars"><img src={imagePath('/images/eevee.png')} alt="" /><img src={imagePath('/images/gengar.png')} alt="" /><img src={imagePath('/images/pikachu.png')} alt="" /></span><span>Para tus cartas.<br />{' '}<strong>Para tu forma de coleccionar.</strong></span><Heart size={18} className="small-heart" /></div>
        </div>
        <div className="hero-art" aria-label="Pikachu y cartas Pokémon en nuestra colección" role="img">
          <div className="hero-grid" /><span className="hero-art-label">POKÉMON + IMPRESIÓN 3D</span><span className="hero-outline">PIKA!</span>
          <div className="orbital orbital-one" /><div className="orbital orbital-two" />
          <Sparkles className="hero-spark spark-one" size={39} strokeWidth={1.4} /><Star className="hero-spark spark-two" size={25} strokeWidth={1.5} />
          <img className="hero-pikachu" src={imagePath('/images/pikachu-hero.png')} alt="" fetchPriority="high" />
          <div className="floating-card"><img src={imagePath('/images/pikachu-card.webp')} alt="" /><span><Sparkles size={11} /> TU COLECCIÓN</span></div>
          <div className="hero-sticker"><Zap size={25} fill="currentColor" /><span>100%<br />{' '}<b>fan energy</b></span></div>
          <div className="hero-art-footer"><span>ATRAPA ESE MOMENTO.</span><ArrowDown size={19} /></div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, i) => <span key={i}>POKÉMON + IMPRESIÓN 3D <Sparkles size={18} /> ACCESORIOS A MEDIDA <Pokeball /> ORGANIZA TU COLECCIÓN <Star size={18} /></span>)}</div></div>

      <section className="category-section container" aria-labelledby="category-title">
        <div className="section-intro"><div><span className="eyebrow">POKÉMON Y ACCESORIOS PARA TUS CARTAS</span><h2 id="category-title">Encuentra tu tipo.</h2></div><p>Productos para coleccionar.<br />{' '}Diseños pensados para ti.</p></div>
        <div className="category-grid">
          <button className="category-tile category-cards" onClick={() => chooseCategory('cards')}><span className="tile-index">01 / TCG</span><div className="tile-copy"><h3>Cartas<br />{' '}individuales</h3><span className="circle-arrow"><ArrowUpRight size={21} /></span></div><div className="tile-visual" aria-hidden="true"><img src={imagePath('/images/charizard-card.webp')} alt="" /></div></button>
          <button className="category-tile category-sealed" onClick={() => chooseCategory('sealed')}><span className="tile-index">02 / LA SORPRESA</span><div className="tile-copy"><h3>Productos<br />{' '}sellados</h3><span className="circle-arrow"><ArrowUpRight size={21} /></span></div><div className="tile-visual" aria-hidden="true"><div className="tile-package"><Pokeball /><span>TCG</span></div></div></button>
          <button className="category-tile category-plush" onClick={() => chooseCategory('plush')}><span className="tile-index">03 / COMPAÑEROS</span><div className="tile-copy"><h3>Peluches<br />{' '}& figuras</h3><span className="circle-arrow"><ArrowUpRight size={21} /></span></div><div className="tile-visual" aria-hidden="true"><img src={imagePath('/images/eevee.png')} alt="" /></div></button>
          <a className="category-tile category-custom-print" href="#impresion-3d"><span className="tile-index">04 / A TU MEDIDA</span><div className="tile-copy"><h3>Impresiones<br />{' '}3D a medida</h3><span className="circle-arrow"><ArrowUpRight size={21} /></span></div><div className="tile-visual" aria-hidden="true"><div className="tile-3d"><Box size={42} strokeWidth={1.4} /><span>3D</span></div></div></a>
        </div>
      </section>

      <CustomPrints />

      <section className="catalog-section container" id="catalogo" aria-labelledby="catalog-title">
        <div className="section-intro"><div><span className="eyebrow"><Sparkles size={14} /> EXPLORA NUESTRO CATÁLOGO POKÉMON</span><h2 id="catalog-title">Pokémon para tu colección<span className="heading-dot">.</span></h2></div><span className="catalog-label">{isDemo ? 'CATÁLOGO DE MUESTRA' : 'CATÁLOGO POKÉNOVA'}</span></div>
        <p className="demo-notice">{isDemo ? 'Estamos preparando la tienda. Precios y existencias de ejemplo, con imágenes referenciales; consulta los valores vigentes por WhatsApp.' : 'Consulta la disponibilidad, el valor final y el envío por WhatsApp.'}</p>
        <div className="catalog-controls"><div className="filter-tabs" aria-label="Categorías de productos">{categories.map(item => <button key={item.id} onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={category === item.id ? 'active' : ''}>{item.label}</button>)}</div><div className="search-sort"><label className="search-field"><Search size={17} /><input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca tu favorito" aria-label="Buscar en el catálogo" /></label><label className="sort-field"><span className="sr-only">Ordenar productos</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select><ChevronDown size={14} /></label></div></div>
        {catalog.status === 'loading' && <div className="catalog-status" role="status"><Sparkles size={25} /><p>Cargando productos…</p></div>}
        {catalog.status === 'error' && <div className="catalog-status" role="alert"><p>No pudimos cargar el catálogo.</p><span>Puedes intentarlo otra vez o consultar los productos por WhatsApp.</span><button className="button button-dark" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Reintentar <ArrowRight size={16} /></button></div>}
        {catalogReady && <p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'favorito por descubrir' : 'favoritos por descubrir'}</p>}
        <div className="product-grid" aria-busy={catalog.status === 'loading'}>{filtered.map(product => <article className="product-card" key={product.id}>
          <button className={`product-image tone-${product.tone}`} onClick={() => setSelectedId(product.id)} aria-label={`Ver detalles de ${product.name}`}>
            {product.badge && <span className="product-badge">{product.badge === 'Favorito' && <Star size={11} fill="currentColor" />} {product.badge}</span>}
            <ProductArt product={product} /><span className="view-product">Ver de cerca <ArrowUpRight size={14} /></span>
          </button>
          <div className="product-info"><span className="product-category">{product.categoryLabel}</span><button className="product-name" onClick={() => setSelectedId(product.id)}>{product.name}</button><div className="product-bottom"><div><strong>{formatPrice(product.price)} <small>CLP</small></strong><span>{product.stock === 0 ? 'Agotado' : isDemo ? 'Precio de ejemplo' : 'Precio en CLP'}</span></div><button className="add-button" onClick={() => add(product)} disabled={product.stock === 0} aria-label={`Agregar ${product.name} al carrito`}><Plus size={20} /></button></div></div>
        </article>)}</div>
        {catalogReady && filtered.length === 0 && <div className="empty-search"><Search size={32} /><h3>{products.length === 0 ? 'Estamos preparando nuevos productos.' : 'Ese Pokémon se nos escondió.'}</h3><p>{products.length === 0 ? 'Mientras tanto, puedes consultar por WhatsApp o cotizar una impresión 3D.' : 'Prueba otra búsqueda o explora todas las categorías.'}</p>{products.length > 0 && <button className="button button-dark" onClick={() => { setQuery(''); setCategory('all'); }}>Ver todos los productos <ArrowRight size={16} /></button>}</div>}
        <div className="catalog-bottom"><span><MessageCircle size={17} /> ¿Quieres un accesorio con tus medidas? Cuéntanos tu idea.</span><a href={whatsappUrl('¡Hola, Pokenova! Quisiera consultar por un producto Pokémon o un accesorio de impresión 3D a medida.')} target="_blank" rel="noreferrer">Hablemos por WhatsApp <ArrowUpRight size={17} /></a></div>
      </section>

      <Buyback />

      <section className="about-section container" id="nosotros" aria-labelledby="about-title">
        <div className="about-art"><div className="about-outline">TCG<br />{' '}+ 3D.</div><img src={imagePath('/images/gengar.png')} alt="Gengar" loading="lazy" /><div className="about-badge"><Heart size={23} /><span>DE FANS<br />{' '}<strong>PARA FANS</strong></span></div><Sparkles size={34} className="about-spark" /></div>
        <div className="about-copy"><span className="eyebrow">HOLA, SOMOS POKÉNOVA <span className="wave" aria-hidden="true">✌️</span></span><h2>Pokémon y diseño<br />{' '}pensados para<br />{' '}<span>tu colección.</span></h2><p>Nos gustan Pokémon y las colecciones bien cuidadas. Por eso reunimos productos TCG y accesorios hechos con impresión 3D a medida.</p><p>Creamos cajas, organizadores y soportes según el formato de tus cartas y sus fundas. Conversemos sobre tus medidas, colores e ideas para definir una pieza que se adapte a ti.</p><a className="text-link" href={whatsappUrl('¡Hola, Pokenova! Me gustaría conocer más sobre la tienda.')} target="_blank" rel="noreferrer">Conversemos de Pokémon <span><ArrowUpRight size={17} /></span></a></div>
      </section>

      <section className="contact-banner container"><div><span className="eyebrow">TÚ PREGUNTA. NOSOTROS TE AYUDAMOS.</span><h2>¿Una duda? <span>¡Te leemos!</span><span className="chat-emoji" aria-hidden="true">💬</span></h2><p>Consulta por productos Pokémon o cuéntanos qué pieza 3D necesitas.</p></div><a className="button button-dark" href={whatsappUrl('¡Hola, Pokenova! Quisiera consultar por productos Pokémon o cotizar una pieza de impresión 3D a medida.')} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Escríbenos por WhatsApp <ArrowUpRight size={18} /></a></section>
    </main>

    <footer className="footer"><div className="container footer-top"><a className="brand" href="#inicio"><img className="brand-symbol" src={imagePath('/favicon.svg?version=2')} alt="" /><span>pokénova<span className="brand-tcg">TCG & 3D</span></span></a><p>Pokémon e impresión 3D.<br />{' '}Accesorios a tu medida.</p><div className="footer-links"><a href="#impresion-3d">Impresión 3D</a><a href="#catalogo">La tienda</a><a href="#compramos">Compramos tus cartas</a><a href="#nosotros">Nuestra historia</a><a href={whatsappUrl('¡Hola, Pokenova! Quisiera hacer una consulta.')} target="_blank" rel="noreferrer">Contacto <ArrowUpRight size={13} /></a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Pokénova TCG. Hecho con ❤️ por PJ.</span><span>Proyecto independiente. Pokémon y sus marcas pertenecen a sus respectivos titulares.</span></div></footer>
    <a className="floating-whatsapp" href={whatsappUrl('¡Hola, Pokenova! Quisiera consultar por Pokémon o impresión 3D a medida.')} target="_blank" rel="noreferrer" aria-label="Consultar precios por WhatsApp"><MessageCircle size={25} /><span>¿Hablamos?</span><span className="whatsapp-dot" /></a>
    <div className={toast ? 'toast visible' : 'toast'} role="status" aria-live="polite">{toast && <><span><Check size={17} /></span>{toast.message}<button className="icon-button" aria-label="Cerrar aviso" onClick={() => setToast(null)}><X size={16} /></button></>}</div>

    {selected && <Dialog onClose={() => setSelectedId(null)} title="Un favorito de cerca" className="product-dialog"><div className={`detail-art tone-${selected.tone}`}><ProductArt product={selected} /></div><span className="eyebrow">{selected.categoryLabel}</span><h3>{selected.name}</h3><p>{selected.description}</p><div className="detail-price"><strong>{formatPrice(selected.price)} CLP</strong><span>{isDemo ? 'Precio de ejemplo · Consulta el valor vigente.' : selected.stock === 0 ? 'Agotado · Consulta por disponibilidad.' : 'Consulta la disponibilidad y el envío.'}</span></div>{isDemo && selected.category === 'plush' && <p className="image-disclaimer">Imagen del personaje como referencia; no representa una fotografía del peluche disponible.</p>}<div className="detail-actions"><button className="button button-dark" onClick={() => add(selected)} disabled={selected.stock === 0}><ShoppingBag size={18} /> Agregar al carrito</button><a className="button button-outline" href={whatsappUrl(`¡Hola, Pokenova! Quisiera consultar el precio y disponibilidad de ${selected.name}.`)} onClick={() => consult(selected.id)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar precio</a></div></Dialog>}

    {cartOpen && <Dialog onClose={() => setCartOpen(false)} title={`Tu colección (${count})`} className="cart-dialog">
      <p className="cart-note">Arma tu consulta. El carrito se vacía al abrir el pedido en WhatsApp.</p>
      {cart.length === 0 ? <div className="cart-empty"><div><ShoppingBag size={43} strokeWidth={1.3} /><Sparkles size={21} /></div><h3>Una aventura por llenar.</h3><p>Tu próxima colección comienza<br />{' '}con un pequeño favorito.</p><button className="button button-dark" onClick={() => { setCartOpen(false); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }); }}>Explorar la tienda <ArrowRight size={17} /></button></div> : <><div className="cart-items">{cart.map(item => { const product = products.find(p => p.id === item.productId); if (!product) return null; return <article className="cart-item" key={item.productId}><div className={`cart-item-art tone-${product.tone}`}><ProductArt product={product} /></div><div className="cart-item-info"><span>{product.categoryLabel}</span><h3>{product.name}</h3><strong>{formatPrice(product.price)} CLP</strong><div className="quantity-controls"><button aria-label={`Reducir cantidad de ${product.name}`} onClick={() => setCart(previous => updateQuantity(previous, product.id, item.quantity - 1, product.stock))}><Minus size={13} /></button><span aria-label={`Cantidad: ${item.quantity}`}>{item.quantity}</span><button aria-label={`Aumentar cantidad de ${product.name}`} disabled={item.quantity >= product.stock} onClick={() => setCart(previous => updateQuantity(previous, product.id, item.quantity + 1, product.stock))}><Plus size={13} /></button></div></div><button className="remove-item icon-button" aria-label={`Eliminar ${product.name}`} onClick={() => setCart(previous => removeFromCart(previous, product.id))}><Trash2 size={17} /></button></article>; })}</div><div className="cart-summary"><div><span>{isDemo ? 'Subtotal de ejemplo' : 'Subtotal'}</span><strong>{formatPrice(subtotal)} CLP</strong></div><p>{isDemo ? 'Los precios y el stock son demostrativos. El valor final, la disponibilidad y el envío se confirman por WhatsApp.' : 'El valor final, la disponibilidad y el envío se confirman por WhatsApp.'}</p><a className="button button-dark" href={whatsappUrl(orderMessage)} onClick={() => consult()} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Consultar mi pedido <ArrowUpRight size={17} /></a><span className="cart-checkout-note"><ShieldCheck size={14} /> Esta consulta no realiza un pago ni reserva productos.</span></div></>}
    </Dialog>}
  </>;
}
