# ⚡ Aura TCG & Print

Estoy creando Aura TCG & Print para reunir productos Pokémon e impresiones 3D a medida: cajas, organizadores y soportes pensados para las cartas de cada colección, con atención por WhatsApp.

## 🛠️ Cómo la estoy construyendo

Para desarrollar la página, uso:

- **React y Vite** para organizar la interfaz y trabajar en el proyecto.
- **CSS** para los colores, el diseño adaptable a móviles y los brillitos animados.
- **Lucide React** para los iconos.
- **localStorage** para guardar el carrito en el navegador hasta abrir la consulta.

## 🛍️ Qué estoy incorporando

Incluyo un catálogo Pokémon, un carrito de consulta y una sección para cotizar piezas 3D según el formato de las cartas, sus medidas y el color elegido. También compro challa y productos sellados.

Preparé la conexión del catálogo a **PostgreSQL en Neon**, mediante un servidor en Node.js. Mientras no la configure, uso productos y precios de ejemplo. Coordino las consultas por WhatsApp, sin pagos dentro de la página.

## 💻 Cómo la ejecuto

Para ver el catálogo de muestra, uso **Node.js 24** y estos comandos dentro del proyecto:

```bash
npm ci --include=dev
npm run dev
```

📖 Dejé las instrucciones para editar productos, imágenes y textos en el [manual de edición](MANUAL.md).

🗄️ Para configurar Neon y preparar la publicación, sigo la [guía de la base de datos](database/README.md).

Hecho con ❤️ por PJ.
