import { useId, useRef, useState } from 'react';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { store } from './site.config.js';

const services = [
  {
    id: 'deck-box',
    name: 'Cajas para mazos',
    label: 'PARA TU MAZO',
    description: 'Cuéntanos cuántas cartas guardas y qué fundas usas. Revisamos contigo el tamaño y los detalles de tu caja.',
  },
  {
    id: 'organizer',
    name: 'Organizadores',
    label: 'CADA CARTA EN SU LUGAR',
    description: 'Separadores y espacios a medida para ordenar tus cartas, toploaders y accesorios como te acomode.',
  },
  {
    id: 'card-stand',
    name: 'Soportes para cartas',
    label: 'PARA EXHIBIR TUS FAVORITAS',
    description: 'Soportes adaptados al formato de tus cartas, toploaders o cartas graduadas. Conversemos cómo quieres exhibirlas.',
  },
];

function ServiceArt({ type }) {
  return <svg className="custom-prints-art" viewBox="0 0 240 140" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === 'deck-box' && <>
      <path d="M68 60 122 41 177 62 122 82Z" />
      <path d="M68 60v48l54 21 55-21V62M122 82v47" />
      <path d="m75 34 48-17 48 18-48 18ZM75 34v12l48 18 48-18V35M123 53v11" />
      <path d="m84 67 25 10M84 76l25 10M137 92l22-8" />
      <path d="M42 64v29m-4-25 4-4 4 4m-8 21 4 4 4-4" opacity=".45" />
      <path d="M183 119h28m-24-4-4 4 4 4m20-8 4 4-4 4" opacity=".45" />
    </>}
    {type === 'organizer' && <>
      <path d="m47 73 93-31 53 21-93 34Z" />
      <path d="M47 73v33l53 20 93-33V63M100 97v29" />
      <path d="m77 63 54 21m-23-32 54 22M77 63v16m31-27v16m54 6v30m-31-20v31" />
      <path d="m59 75 18-6 12 5-18 6Zm50-17 21-7 11 5-20 7" />
      <path d="M64 29h29m-25-4-4 4 4 4m21-8 4 4-4 4" opacity=".45" />
      <path d="M209 66v31m-4-27 4-4 4 4m-8 23 4 4 4-4" opacity=".45" />
    </>}
    {type === 'card-stand' && <>
      <path d="m65 108 67-22 48 16-66 25Z" />
      <path d="M65 108v7l49 17 66-25v-5M114 127v5" />
      <path d="m91 28 56-9 14 74-56 11Z" />
      <path d="m98 35 43-7 11 58-43 8Z" opacity=".6" />
      <path d="m94 111-2-13 24 7 26-10 2 10-28 11Z" />
      <path d="m129 101 10 9M109 96l-1 10" />
      <path d="M45 36v49m-4-45 4-4 4 4m-8 41 4 4 4-4" opacity=".45" />
      <path d="M182 37h27m-23-4-4 4 4 4m19-8 4 4-4 4" opacity=".45" />
    </>}
  </svg>;
}

export default function CustomPrints() {
  const formId = useId();
  const ideaRef = useRef(null);
  const [serviceId, setServiceId] = useState(services[0].id);
  const [format, setFormat] = useState('Por definir');
  const [dimensions, setDimensions] = useState({ width: '', height: '', depth: '' });
  const [color, setColor] = useState('');
  const [idea, setIdea] = useState('');

  const selectedService = services.find(service => service.id === serviceId);
  const dimensionDetails = [
    dimensions.width && `Ancho: ${dimensions.width} mm`,
    dimensions.height && `Alto: ${dimensions.height} mm`,
    dimensions.depth && `Fondo: ${dimensions.depth} mm`,
  ].filter(Boolean);
  const message = [
    '¡Hola, Aura! Quiero cotizar una impresión 3D a medida.',
    `Tipo: ${selectedService.name}`,
    `Formato de mi colección: ${format}`,
    dimensionDetails.length ? `Medidas orientativas: ${dimensionDetails.join(', ')}` : 'Medidas por confirmar.',
    color.trim() && `Color o combinación: ${color.trim()}`,
    `Mi idea: ${idea.trim()}`,
    '¿Podemos revisar el diseño, el material, el precio y la disponibilidad?',
  ].filter(Boolean).join('\n');

  const chooseService = (id) => {
    setServiceId(id);
    ideaRef.current?.focus();
  };

  return <section className="custom-prints-section container" id="impresion-3d" aria-labelledby={`${formId}-title`}>
    <div className="custom-prints-intro section-intro">
      <div><span className="eyebrow">IMPRESIÓN 3D A MEDIDA</span><h2 id={`${formId}-title`}>Un espacio para cada carta.</h2></div>
      <p>Diseñamos piezas para ordenar y exhibir tu colección Pokémon. Cuéntanos qué necesitas y lo revisamos contigo.</p>
    </div>

    <div className="custom-prints-services">
      {services.map(service => <button className={`custom-prints-card${service.id === serviceId ? ' is-selected' : ''}`} type="button" key={service.id} aria-pressed={service.id === serviceId} onClick={() => chooseService(service.id)}>
        <ServiceArt type={service.id} />
        <div className="custom-prints-card-copy">
          <span className="custom-prints-card-label">{service.label}</span>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <span className="text-link">Cotizar <span><ArrowUpRight size={17} aria-hidden="true" /></span></span>
        </div>
      </button>)}
    </div>

    <div className="custom-prints-form-wrap">
      <div className="custom-prints-form-intro">
        <span className="eyebrow">CONVERSEMOS TU IDEA</span>
        <h3>¿Qué quieres hacer?</h3>
        <p>Completa lo que ya tengas pensado. Si aún no sabes las medidas o el color, podemos conversarlo por WhatsApp.</p>
      </div>
      <form className="custom-prints-form" action={`https://wa.me/${store.whatsapp}`} method="get" target="_blank" rel="noreferrer">
        <input type="hidden" name="text" value={message} />
        <div className="custom-prints-fields">
          <div className="custom-prints-field">
            <label htmlFor={`${formId}-type`}>Tipo de pieza</label>
            <select id={`${formId}-type`} value={serviceId} onChange={event => setServiceId(event.target.value)}>
              {services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}
            </select>
          </div>
          <div className="custom-prints-field">
            <label htmlFor={`${formId}-format`}>Formato de tu colección</label>
            <select id={`${formId}-format`} value={format} onChange={event => setFormat(event.target.value)}>
              <option>Por definir</option>
              <option>Cartas con funda</option>
              <option>Toploaders</option>
              <option>Cartas graduadas</option>
            </select>
          </div>
        </div>
        <fieldset className="custom-prints-dimensions">
          <legend>Medidas orientativas en mm (opcional)</legend>
          <div className="custom-prints-fields">
            {[['width', 'Ancho'], ['height', 'Alto'], ['depth', 'Fondo']].map(([key, label]) => <div className="custom-prints-field" key={key}>
              <label htmlFor={`${formId}-${key}`}>{label} (mm)</label>
              <input id={`${formId}-${key}`} type="number" min="1" step="0.1" inputMode="decimal" value={dimensions[key]} aria-describedby={`${formId}-dimensions-hint`} onChange={event => setDimensions(previous => ({ ...previous, [key]: event.target.value }))} />
            </div>)}
          </div>
          <p className="custom-prints-hint" id={`${formId}-dimensions-hint`}>Puedes dejarlas en blanco si todavía no las sabes. Confirmaremos las medidas antes de preparar la pieza.</p>
        </fieldset>
        <div className="custom-prints-field">
          <label htmlFor={`${formId}-color`}>Color o combinación (opcional)</label>
          <input id={`${formId}-color`} type="text" maxLength="80" value={color} placeholder="Por ejemplo: azul y violeta" onChange={event => setColor(event.target.value)} />
        </div>
        <div className="custom-prints-field">
          <label htmlFor={`${formId}-idea`}>Tu idea (obligatorio)</label>
          <textarea id={`${formId}-idea`} ref={ideaRef} required maxLength="800" rows="4" value={idea} placeholder="Cuéntanos qué quieres guardar o exhibir, cuántas cartas tienes y los detalles que te gustaría incluir." onChange={event => {
            event.target.setCustomValidity(event.target.value.trim() ? '' : 'Cuéntanos tu idea para preparar la consulta.');
            setIdea(event.target.value);
          }} />
        </div>
        <p className="custom-prints-note">El diseño, el material, el precio y la disponibilidad se confirman por WhatsApp.</p>
        <button className="custom-prints-submit button button-dark" type="submit"><MessageCircle size={19} aria-hidden="true" /> Cotizar por WhatsApp <ArrowUpRight size={17} aria-hidden="true" /></button>
      </form>
    </div>
  </section>;
}
