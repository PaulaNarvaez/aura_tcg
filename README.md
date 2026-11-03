# ⚡ Pokénova TCG

Estoy creando Pokénova TCG para reunir productos Pokémon e impresiones 3D a medida: cajas, organizadores y soportes pensados para las cartas de cada colección, con atención por WhatsApp.

## 🛠️ Cómo la estoy construyendo

Para desarrollar la página, uso:

- **React y Vite** para organizar la interfaz y trabajar en el proyecto.
- **CSS** para los colores, el diseño adaptable a móviles y los brillitos animados.
- **Lucide React** para los iconos.
- **localStorage** para guardar el carrito en el navegador hasta abrir la consulta.

## 🛍️ Qué estoy incorporando

Incluyo un catálogo Pokémon, un carrito de consulta y una sección para cotizar piezas 3D según el formato de las cartas, sus medidas y el color elegido. También compro challa y productos sellados.

Dejé preparada la conexión del catálogo a **Supabase** para productos, precios, existencias y fotos. Mientras no la configure, uso datos de ejemplo. Coordino las consultas por WhatsApp, sin pagos dentro de la página.

## 💻 Cómo la ejecuto

Uso **Node.js 24** y estos comandos dentro del proyecto:

```bash
npm ci --include=dev
npm run dev
```

📖 Dejé las instrucciones para editar productos, imágenes y textos en el [manual de edición](MANUAL.md).

🗄️ Para activar la base de datos y preparar la publicación, sigo la [guía de Supabase](supabase/README.md).

Hecho con ❤️ por PJ.
