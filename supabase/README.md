# Conectar el catálogo a Supabase

La conexión está preparada en el código. Todavía necesitas crear tu proyecto y configurar sus datos: este repositorio no incluye una base de datos remota ni ha ejecutado la migración en tu cuenta.

Supabase guardará los productos, precios y existencias en PostgreSQL, y las fotografías en Storage. Las cajas, organizadores y soportes 3D a medida siguen cotizándose por WhatsApp; no se les asignan precios ni stock automáticamente.

## 1. Crear el proyecto y la tabla

1. Entra en [Supabase](https://supabase.com/) y crea un proyecto nuevo para Pokénova. Guarda su contraseña de base de datos de forma privada; la página no la necesita.
2. Cuando el proyecto termine de crearse, abre **SQL Editor → New query**.
3. Copia todo el archivo [001_catalog.sql](migrations/001_catalog.sql), ejecútalo una sola vez y comprueba que termina sin errores.
4. Verifica en **Table Editor** que existe `public.products`, y en **Storage** que existe `product-images`.

La migración está pensada para un proyecto nuevo. Si ya existe una tabla `products` o un bucket `product-images`, revisamos su configuración antes de ejecutarla. No borres tablas ni fotografías para resolver un error.

La tabla queda vacía: los productos de muestra de la web no se importan como inventario real. Los registros nuevos comienzan con `is_published = false`.

## 2. Cargar las fotografías y los productos

En **Storage → product-images**, sube la fotografía y copia su **URL pública**. Se admiten JPG, PNG, WebP y AVIF de hasta 5 MB. Este bucket es público: úsalo solo para fotos de productos.

Luego abre **Table Editor → products → Insert row** y completa:

| Campo | Qué escribir |
| --- | --- |
| `id` | Se genera automáticamente. Consérvalo al actualizar el producto. |
| `name` | Nombre del producto. |
| `category` | `cards`, `sealed`, `plush` o `accessories`. |
| `price` | Precio real en pesos chilenos, como entero sin puntos: `18990`. |
| `stock` | Unidades disponibles, como entero; `0` indica agotado. |
| `image` | URL pública HTTPS de la foto, o `NULL` si todavía no tienes una. |
| `description` | Descripción, idioma, estado, medidas u otros detalles relevantes. |
| `badge` | Etiqueta opcional, como `Nuevo`, o `NULL`. |
| `tone` | Fondo de la tarjeta: `yellow`, `orange`, `purple`, `peach`, `blue` o `mint`. |
| `sort_order` | Orden de aparición; los números menores aparecen primero. |
| `is_published` | Activa `true` cuando la ficha esté lista para mostrarse. |

Para retirar una ficha, cambia `is_published` a `false`. Para actualizar precio, foto o existencias, edita la misma fila. El carrito sigue siendo una lista de consulta: abrir WhatsApp no descuenta stock ni reserva productos. Actualiza las existencias después de acordar una venta.

Por ahora la administración se hace en el dashboard de Supabase. Todavía no hay un panel de administración propio en la página.

## 3. Conectar tu copia local

En la configuración del proyecto de Supabase, busca **Project URL** y la **Publishable key**. La clave pública nueva comienza con `sb_publishable_`; también puedes usar la clave heredada `anon`. Nunca uses una clave `service_role`, `sb_secret_` ni la contraseña de la base de datos.

En la carpeta del proyecto, copia `.env.example` a `.env.local` y completa:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Guarda el archivo, detén Vite con **Ctrl + C** y ejecuta `npm run dev` otra vez. Los archivos `.env.local` están excluidos de Git.

Con ambas variables vacías, la página mantiene el catálogo de muestra. Al configurarlas, la página usa la base de datos; si la conexión falla, muestra un aviso para reintentar, sin presentar los ejemplos como productos reales. Una tabla sin fichas publicadas muestra un catálogo vacío. Si falta una variable o se usa una clave con permisos privados, Vite detiene el arranque o la compilación y pide revisar la configuración.

Las variables `VITE_` forman parte de los archivos públicos de la web. Por eso se utiliza únicamente una clave pública, con permisos de lectura limitados mediante RLS. Las visitas pueden ver productos publicados; no pueden insertar, actualizar ni borrar productos con esa clave. Los borradores no son visibles para visitantes.

## 4. Usar la conexión en GitHub Pages

1. En el repositorio de GitHub, abre **Settings → Secrets and variables → Actions → Variables**.
2. Crea las variables de repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los mismos valores públicos que usaste localmente.
3. Revisa **Settings → Pages → Source: GitHub Actions**.
4. En **Actions → Publicar tienda → Run workflow**, elige `main` y espera a que finalice correctamente.

Las variables se incorporan al compilar. Si cambias la URL o la clave pública, vuelve a ejecutar la publicación. Los cambios en las filas de Supabase se consultan al abrir o recargar la tienda, sin recompilarla.

Subir código a GitHub y publicar la página son pasos distintos. La conexión solo queda verificada cuando tu proyecto esté configurado y podamos comprobar que los productos publicados se cargan desde esa base de datos.
