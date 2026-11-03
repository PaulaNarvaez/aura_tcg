import { ArrowUpRight, Camera, Layers, Package } from 'lucide-react';
import { whatsappUrl } from './site.config.js';

export default function Buyback() {
  return <section className="buyback-section" id="compramos" aria-labelledby="buyback-title">
    <div className="container buyback-inner">
      <div className="buyback-copy">
        <span className="eyebrow">¿QUIERES VENDERNOS TU COLECCIÓN?</span>
        <h2 id="buyback-title">Compramos tu challa<br />{' '}<span>y productos sellados.</span></h2>
        <p>¿Tienes cartas que ya no usas o productos cerrados? Envíanos fotos y detalles por WhatsApp para que revisemos tu colección y conversemos una oferta.</p>
        <span className="buyback-tag"><Camera size={16} /> Fotos + cantidades + estado de los productos</span>
      </div>
      <div className="buyback-options">
        <article className="buyback-option">
          <span className="buyback-icon"><Layers size={25} strokeWidth={1.6} /></span>
          <div className="buyback-option-copy">
          <h3>Challa y cartas sueltas</h3>
          <p>Lotes de cartas Pokémon y cartas individuales de distintas expansiones. Cuéntanos cuántas tienes y en qué estado están.</p>
          <a className="text-link" href={whatsappUrl('¡Hola, Aura! Quiero venderles challa o cartas Pokémon sueltas. Les enviaré fotos, cantidades y detalles del estado para consultar una oferta.')} target="_blank" rel="noreferrer">Vender mi challa <span><ArrowUpRight size={17} /></span></a>
          </div>
        </article>
        <article className="buyback-option">
          <span className="buyback-icon"><Package size={25} strokeWidth={1.6} /></span>
          <div className="buyback-option-copy">
          <h3>Productos sellados</h3>
          <p>Sobres, ETB, cajas y colecciones sin abrir. Envíanos fotos de los sellos y el nombre de cada producto.</p>
          <a className="text-link" href={whatsappUrl('¡Hola, Aura! Quiero ofrecerles productos Pokémon sellados. Les enviaré fotos de los productos y sus sellos, cantidades y ediciones para consultar una oferta.')} target="_blank" rel="noreferrer">Ofrecer productos sellados <span><ArrowUpRight size={17} /></span></a>
          </div>
        </article>
        <p className="buyback-footnote">Cada oferta se revisa según los productos, su cantidad y su estado. Escríbenos para conversar los detalles.</p>
      </div>
    </div>
  </section>;
}
