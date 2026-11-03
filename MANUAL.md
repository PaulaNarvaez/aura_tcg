# Manual de edición de Pokénova TCG

Esta guía explica cómo mantener la tienda: agregar productos, cambiar fotos y precios, editar textos y publicar los cambios.

La tienda puede usar el catálogo de muestra de sus archivos o cargar productos desde Supabase al configurar la conexión. Todavía no tiene un panel de administración propio. Puedes hacer los cambios por tu cuenta o enviarme las imágenes y los datos para que los preparemos aquí. Para crear y conectar la base de datos, sigue la [guía de Supabase](supabase/README.md).

## 1. Cómo enviarme productos para publicar

Adjunta las fotos en este chat y acompaña cada producto con esta ficha:

```text
Acción: agregar / actualizar / retirar
Nombre del producto:
Categoría: cartas / sellados / peluches y figuras / accesorios
Precio de venta en CLP:
Unidades disponibles:
Descripción:
Foto principal: indicar cuál, si adjuntas varias
Etiqueta opcional: por ejemplo, Nuevo o Destacado
```

Puedes enviarme varios productos juntos. Identifica las fotos con el nombre de cada producto para que queden asociadas correctamente.

Agrega los detalles que correspondan:

- **Cartas:** expansión, número de carta, idioma y estado de conservación. Una foto del reverso ayuda a describir el estado.
- **Sellados:** edición, idioma, contenido y estado del sello.
- **Peluches y figuras:** tamaño y características del artículo.
- **Accesorios:** medidas, capacidad o compatibilidad, si corresponde.

Para una actualización, basta con decir qué producto cambia y cuál es el nuevo dato. Por ejemplo: «Peluche Eevee: precio $18.990, quedan 3 unidades y reemplaza la foto por la que adjunto».

Con esa información puedo incorporar las fotos, actualizar las fichas, revisar cómo se ven en móvil y escritorio y subir los cambios a GitHub con PaulaNarvaez como autora. Los títulos de los commits mantienen la hora y fecha reales de Chile. La publicación de la web se realiza con el flujo de GitHub Pages explicado en la sección 9.

Si un dato está por definir, indícalo. Los precios y existencias de ejemplo no se deben convertir en información comercial real sin que confirmes esos datos.

## 2. Dónde se cambia cada cosa

| Qué quieres cambiar | Archivo o carpeta |
| --- | --- |
| Productos de muestra, precios, existencias y descripciones | `src/catalog.js` |
| Fotos de muestra y recursos de la página | `public/images/` |
| Productos y fotos reales al activar Supabase | Table Editor y Storage de Supabase; [guía](supabase/README.md) |
| Configuración local de la conexión | `.env.local`, a partir de `.env.example` |
| Número de WhatsApp | `src/site.config.js` |
| Portada, textos del catálogo, Quiénes somos y pie de página | `src/App.jsx` |
| Textos y mensajes de la sección de compra de challa y sellados | `src/Buyback.jsx` |
| Servicios y formulario de cotización de impresión 3D a medida | `src/CustomPrints.jsx` |
| Colores, tamaños, tarjetas, fondo y animaciones | `src/styles.css` |
| Símbolo del logo e icono de la pestaña | `public/favicon.svg` |
| Título de la pestaña y descripción para buscadores | `index.html` |
| Publicación de la web | `.github/workflows/pages.yml` |

Puedes abrir la carpeta del proyecto en Visual Studio Code y usar **Ctrl + Shift + F** para buscar un texto en todos los archivos.

## 3. Ver la tienda mientras editas

En **Símbolo del sistema (CMD)** de Windows, entra en la carpeta del proyecto. Si ya estás dentro de `pokenova_tcg`, no necesitas repetir este paso:

```bat
cd /d "%USERPROFILE%\Downloads\pokenova_tcg"
```

La carpeta debe contener `package.json`. Si la descargaste en otro lugar o el ZIP creó una carpeta adicional, ajusta la ruta hasta llegar a ese archivo.

Para la primera instalación, usa **Node.js 24** y ejecuta:

```bat
node --version
npm ci --include=dev
npm run dev
```

`node --version` debe mostrar `v24…`. Espera a que la instalación termine sin errores antes de arrancar.

Si aparece **«"vite" no se reconoce como un comando interno o externo»**, faltan las dependencias de desarrollo o su instalación quedó incompleta. Dentro de esta misma carpeta, ejecuta `npm ci --include=dev` y, cuando termine correctamente, `npm run dev`. No necesitas instalar Vite globalmente ni borrar `package-lock.json`. Si la instalación falla, comparte su mensaje de error para revisar la causa.

En las siguientes ocasiones, basta con:

```bat
npm run dev
```

Abre en tu navegador la dirección que indique la terminal. Mantén esa terminal abierta; al guardar los archivos, la página se actualiza. Para detener el servidor, presiona **Ctrl + C**.

Si yo ya subí una actualización a GitHub y tú no tienes cambios locales pendientes, detén el servidor y ejecuta dentro del proyecto:

```bat
git pull
npm ci --include=dev
npm run dev
```

Si Git indica que tus propias ediciones impiden actualizar, compárteme el mensaje para integrar ambos cambios. La reinstalación después de actualizar incorpora las dependencias de `package-lock.json`.

## 4. Agregar y editar productos

Estas instrucciones editan el catálogo de muestra. Si ya activaste Supabase, administra las fichas reales en **Table Editor → products** y sus fotos en **Storage**; los cambios se cargan al abrir o recargar la página.

Abre `src/catalog.js`. Busca la lista que empieza con:

```js
export const products = [
```

Cada bloque dentro de esa lista representa un producto. Para agregar uno, copia un bloque, cambia sus datos y colócalo antes del cierre `];` de la lista. Deja una coma entre los bloques.

### Ejemplo de un producto

Este ejemplo utiliza un precio y una cantidad ficticios. Reemplázalos y copia primero tu foto a `public/images/etb-151-ingles.jpg` antes de usarlo.

```js
{
  id: 'etb-151-ingles',
  name: 'ETB Pokémon 151 · Inglés',
  category: 'sealed',
  categoryLabel: 'Sellados & ETB',
  price: 59990,
  image: '/images/etb-151-ingles.jpg',
  badge: 'Nuevo',
  tone: 'blue',
  description: 'Elite Trainer Box Pokémon 151 en inglés. Producto sellado.',
  stock: 3,
},
```

| Campo | Cómo editarlo |
| --- | --- |
| `id` | Identificador único, sin espacios ni tildes. Por ejemplo, `etb-151-ingles`. Conserva el mismo al actualizar un producto existente. |
| `name` | Nombre que verá el cliente. |
| `category` | Usa uno de los identificadores de la tabla siguiente. |
| `categoryLabel` | Nombre visible de la categoría. |
| `price` | Precio en pesos chilenos: número sin `$`, puntos, comas ni comillas. Para $24.990, escribe `24990`. |
| `image` | Ruta de la foto, por ejemplo `/images/etb-151-ingles.jpg`. |
| `badge` | Etiqueta opcional sobre la imagen. Puedes quitar esa línea si no quieres etiqueta. |
| `tone` | Color del fondo: `yellow`, `orange`, `purple`, `peach`, `blue` o `mint`. |
| `description` | Texto que aparece al abrir la ficha del producto. |
| `stock` | Cantidad disponible: número entero, como `3`. |

### Categorías disponibles

| Producto | `category` | `categoryLabel` |
| --- | --- | --- |
| Cartas individuales | `cards` | `Cartas` |
| Sobres, ETB, cajas y colecciones selladas | `sealed` | `Sellados & ETB` |
| Peluches y figuras | `plush` | `Peluches` |
| Fundas, carpetas, llaveros y otros accesorios | `accessories` | `Accesorios` |

`all` es el filtro «Todo el universo»; no lo uses como categoría de un producto.

Los productos se muestran inicialmente en el orden de la lista. Mueve un bloque más arriba para que aparezca antes en «Destacados».

Para crear una categoría nueva, dime su nombre y qué productos incluirá. Además del filtro, hay que ajustar las tarjetas de categorías de la portada, que están en `src/App.jsx`.

### Cambiar una foto o un precio

Para reemplazar la foto de Peluche Eevee, por ejemplo:

1. Copia tu foto a `public/images/peluche-eevee-real.jpg`.
2. Busca el bloque con `id: 'eevee-plush'`.
3. Cambia la línea de la imagen:

```js
image: '/images/peluche-eevee-real.jpg',
```

Para cambiar el precio o las unidades, modifica únicamente sus valores en ese mismo bloque:

```js
price: 18990,
stock: 3,
```

Esos números también son un ejemplo. Guarda el archivo y revisa la ficha en el navegador.

### Productos agotados o retirados

- `stock: 0` muestra «Agotado» e impide agregar unidades al carrito. El producto sigue visible y se puede consultar por WhatsApp.
- Para retirar un producto del catálogo, elimina su bloque completo de la lista o pídeme que lo retire.
- El stock se actualiza manualmente. Abrir una consulta por WhatsApp no descuenta existencias ni reserva productos. Actualiza la cantidad cuando confirmes una venta.
- La versión actual usa precios numéricos. Si quieres mostrar «Precio a consultar» en ciertos productos, podemos incorporar esa opción.

## 5. Preparar las fotos

Usa preferentemente fotos JPG o PNG, nítidas y con el producto completo. Una imagen de aproximadamente 1000 × 1000 píxeles suele funcionar bien; no hace falta que todas tengan esas medidas exactas.

Nombra los archivos en minúsculas, sin espacios ni tildes. Por ejemplo:

```text
peluche-eevee-real.jpg
charizard-ex-frente.jpg
etb-151-ingles.jpg
```

La relación entre carpeta y ruta es:

```text
Archivo: public/images/peluche-eevee-real.jpg
En el catálogo: image: '/images/peluche-eevee-real.jpg'
```

Respeta exactamente el nombre y la extensión del archivo: GitHub Pages distingue mayúsculas de minúsculas. En el campo `image`, no agregues `public/` ni una ruta de tu computador.

Usa un archivo nuevo para cada foto real de producto. Algunas imágenes actuales, como `pikachu.png`, se comparten entre varios productos y partes de la portada; reemplazarlas cambiaría todos esos lugares.

Cada producto muestra una foto principal. Si envías varias, indica cuál quieres destacar; una galería de fotos requeriría una ampliación de la ficha. Si dejas `image: null`, aparece una ilustración conceptual en lugar de una fotografía.

## 6. Editar textos, WhatsApp y logo

### WhatsApp

Abre `src/site.config.js` y modifica este valor si cambia el número:

```js
whatsapp: '56998716582',
```

Usa el código de país y el número completo, solamente con dígitos: sin `+`, espacios ni guiones. Ese valor actualiza los enlaces de atención de toda la tienda.

Los mensajes preparados para consultas de productos y pedidos están en `src/App.jsx`; los mensajes para ofrecer challa o sellados están en `src/Buyback.jsx`.

### Impresión 3D a medida

Las opciones de cajas para mazos, organizadores y soportes están en `src/CustomPrints.jsx`. Allí puedes editar sus explicaciones y el mensaje de cotización.

El formulario permite elegir el formato de la colección e indicar medidas en milímetros, color e idea del diseño. Las medidas y el color son opcionales; el cliente puede consultar antes de tenerlos definidos. El mensaje se prepara para WhatsApp y el cliente debe enviarlo allí.

Estos servicios no se agregan al carrito ni tienen un precio fijo en el catálogo. El diseño, los materiales, el precio y la disponibilidad se confirman durante la conversación. Si incorporamos productos 3D con fotos y precios confirmados, podremos añadirlos al catálogo como accesorios.

### Portada, Quiénes somos y pie de página

Busca el texto que quieres cambiar en `src/App.jsx`. Puedes reemplazar las palabras conservando las etiquetas y la estructura del archivo. Por ejemplo, el texto «Hecho con ❤️» está en el pie de página de ese archivo.

En `src/Buyback.jsx` puedes editar las explicaciones y botones de «Compramos tu challa y productos sellados».

El nombre visible de la marca está escrito en `src/App.jsx`. Cambiar únicamente `name` en `src/site.config.js` no lo reemplaza en los textos ni en los mensajes.

### Título de pestaña y logo

En `index.html`, cambia el texto entre `<title>` y `</title>` para editar el título de la pestaña. La etiqueta `meta` con `name="description"` contiene la descripción para buscadores.

El símbolo que aparece en el encabezado, el pie y la pestaña sale del mismo archivo: `public/favicon.svg`. Si me envías un logo nuevo, puedo prepararlo para esos tres lugares.

Si el navegador conserva el icono anterior, recarga con **Ctrl + F5** y vuelve a abrir la pestaña. La referencia del icono lleva `?version=2`; si hace falta actualizar esa versión, debe cambiarse tanto en `index.html` como en las imágenes del logo en `src/App.jsx`.

## 7. Colores, fondo y diseño adaptable

Los estilos están en `src/styles.css`. Los colores principales se declaran al comienzo, dentro de `:root`:

```css
--ink: #17382e;
--paper: #faf9f5;
--yellow: #ffe15b;
--blue: #3158d4;
```

`ink` corresponde al verde oscuro, `paper` al fondo claro, `yellow` al amarillo y `blue` al azul. Algunos bloques tienen colores propios, como `.hero-art` y `.tone-yellow`; un cambio de paleta completo debe revisar también esos estilos.

El fondo animado utiliza `.animated-background` y `.background-orb` para los colores suaves, y `.background-glint` para los brillitos. Su posición, tamaño y ritmo se definen en `backgroundGlints`, al comienzo de `src/App.jsx`; sus formas y animaciones están en `src/styles.css`. Las reglas al final para `prefers-reduced-motion` respetan la preferencia de quienes necesitan menos movimiento.

Las tarjetas de categorías utilizan espacios separados para índice, texto e imagen. Para modificar tamaños o columnas, conserva las reglas de móvil y tablet y revisa el resultado en distintos anchos.

También puedes pedirme el cambio con palabras sencillas: «quiero más azul», «el texto está muy pequeño» o «esta foto se ve cortada», acompañando una captura si ayuda.

## 8. Pasar del catálogo de ejemplo al catálogo real

Sin configurar Supabase, la tienda usa productos, precios y existencias de demostración. Incorporar fotos propias en los archivos no cambia automáticamente ese estado.

Para activar el catálogo real, sigue la [guía de Supabase](supabase/README.md): crea el proyecto, ejecuta la migración, agrega tus fichas y configura la URL y la clave pública. No se copian los ejemplos automáticamente a la base de datos.

Con la conexión configurada, los avisos de ejemplo se retiran del catálogo, de las fichas y del carrito. Si la conexión falla, aparece un aviso con un botón para reintentar; no se reemplaza el inventario por productos de muestra. Las fichas con `stock = 0` aparecen como agotadas y mantienen la opción de consultar por WhatsApp.

Publica solo fotos, precios y existencias confirmados. El carrito sigue siendo una consulta; no descuenta existencias ni reserva productos.

## 9. Revisar y publicar

### Revisar los cambios

Antes de subir una edición, comprueba que las fotos carguen, que los precios y cantidades sean correctos y que el mensaje de WhatsApp corresponda al producto elegido. Al consultar el pedido se vacía todo el carrito; al consultar desde la ficha se retira únicamente ese producto.

Para comprobar que la página puede compilarse:

```bat
npm run build
```

Para validar la lógica:

```bat
npm test
```

Si cambiamos comportamiento o diseño, podemos ejecutar también `npm run test:e2e`. El flujo de publicación ejecuta `npm test` antes de compilar: si falla, la nueva versión no se publica. Si agregamos campos o funcionalidades, debemos adaptar las pruebas para comprobar ese comportamiento.

### Subir el contenido a GitHub

Si hacemos la actualización en este chat, puedo subir los cambios al repositorio como venimos haciendo.

Si editas por tu cuenta, puedes usar GitHub Desktop: abre el repositorio, revisa los archivos modificados, crea un commit y pulsa **Push origin**. Configura tu identidad de PaulaNarvaez antes del primer commit. Escribe como título la hora y fecha de Chile con formato `HH:mm:ss · DD-MM-YYYY`; describe el cambio en el cuerpo.

También puedes editar un archivo desde GitHub con el botón del lápiz o subir imágenes desde **Add file → Upload files** en `public/images/`. Subir la foto por sí sola no agrega un producto: su ficha también debe referenciarla en `src/catalog.js`.

### Publicar la web pública

Subir los archivos a GitHub y publicar la web son pasos distintos. El flujo de publicación actual se ejecuta manualmente:

1. La primera vez, en **Settings → Pages**, selecciona **GitHub Actions** como origen.
2. Después de subir los cambios a `main`, abre **Actions → Publicar tienda → Run workflow** y selecciona `main`.
3. Espera a que termine correctamente. GitHub mostrará la dirección de la web en **Settings → Pages** y en el despliegue.
4. Abre esa dirección y comprueba que aparezcan los nuevos productos.

Ver los nuevos archivos en el repositorio no confirma que la web pública se haya actualizado. Del mismo modo, `npm run dev` muestra tu copia de desarrollo, no publica la tienda en Internet.

Si usas Supabase, configura las dos variables públicas también en GitHub antes de publicar, como explica la [guía de conexión](supabase/README.md). El archivo `.env.local` de tu computador no se sube al repositorio ni configura GitHub Pages.

Si un paso falla, envíame el mensaje de error o una captura y podremos revisar el punto que falta.
