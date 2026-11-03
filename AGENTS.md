# Pokenova TCG

## Desarrollo

- Trabaja en el checkout existente. Cada tarea de la nube ya está aislada; no crees un worktree salvo petición explícita.
- Instala las dependencias con `npm ci --include=dev` y respeta `package-lock.json`.
- Usa `npm run dev` para desarrollo, `npm run build` para producción, `npm test` para la lógica y `npm run test:e2e` para los flujos del navegador.
- Mantén la tienda en español y los precios de venta en pesos chilenos (CLP).
- Presenta Pokénova como productos Pokémon e impresión 3D a medida: cajas para mazos, organizadores y soportes para cartas. La cotización se realiza por WhatsApp; el diseño, las medidas, los materiales y el precio se acuerdan en la consulta.
- No presentes precios o stock de ejemplo como información comercial real. Confirma el valor vigente, la disponibilidad y el envío mediante la atención de la tienda.
- Mantén el carrito como una lista de consulta, sin pagos ni reservas. Al pulsar **Consultar mi pedido**, limpia todo el carrito local; al consultar un producto desde su ventana de detalles, elimina solo ese producto del carrito.
- La sección **Compramos tus cartas** recibe consultas por challa/cartas sueltas, lotes y productos sellados. La tasación se coordina por WhatsApp; no prometas un precio fijo ni una compra automática.
- Conserva el diseño adaptable a celulares, usa el logo de la tienda como icono de pestaña y respeta `prefers-reduced-motion` en las animaciones.

## Commits

- Usa como título la hora y fecha reales del commit en la zona `America/Santiago`, con formato `HH:mm:ss · DD-MM-YYYY`. Describe los cambios en el cuerpo del mensaje si hace falta.
- La identidad de autora del repositorio es **PaulaNarvaez**. Verifica la configuración local y reutiliza su identidad ya verificada en el historial; no uses la identidad predeterminada de otra persona.

## Configuración

- El número público de WhatsApp está en `src/site.config.js`: **+56 9 9871 6582**.
- La atención de la tienda utiliza solo WhatsApp, según la preferencia de la usuaria.
- El catálogo de demostración está en `src/catalog.js`.
- La usuaria eligió **Neon (PostgreSQL)** y quiere comenzar sin costo mientras prueba. La conexión privada está en `DATABASE_URL`, leída solo por el servidor de `server/`. Nunca expongas la conexión en variables `VITE_`, respuestas, errores o archivos de Git.
- El catálogo real se activa con `VITE_CATALOG_API_URL=/api/products`; `src/catalog-source.js` carga la API y valida los productos. Sin esa variable se usa la muestra; si la API falla, muestra error y reintento sin volver a ejemplos. Restaura y guarda el carrito solo después de cargar el inventario correctamente.
- El esquema y las instrucciones están en `database/`. El servidor solo expone lectura de productos publicados. No hay panel privado propio ni conexión remota configurada aún. Para publicación con Node y Neon, la guía propone Render; GitHub Pages sirve únicamente los archivos estáticos.
- Las opciones y el formulario de cotización de impresión 3D están en `src/CustomPrints.jsx`. Son servicios a cotizar, sin precios ni existencias inventados.
- No guardes credenciales ni archivos `.env` en Git.
- La compilación acepta `VITE_BASE_PATH` para alojarse en una subruta, por ejemplo `/pokenova_tcg/` en GitHub Pages.
