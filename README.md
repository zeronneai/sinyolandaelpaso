# Sin Yolanda El Paso

Sitio oficial y plataforma propia de la sucursal de El Paso, TX: reservaciones como OpenTable pero con su marca, la app de cada mesa con QR, la pantalla del bar y un admin en tiempo real. Hecho por Purple Roots Agency.

Vite + HTML/CSS/JS sin framework, Supabase (Postgres + Realtime + Storage), Apps Script para los correos y funciones de Vercel para Stripe.

## Correr en local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/
npm run seed      # regenera supabase/seed.sql desde src/plataforma/seed.js
```

Sin variables de Supabase todo corre en **modo local**: los datos viven en `localStorage` y se sincronizan con `BroadcastChannel` entre pestañas del mismo navegador. Sirve para probar (por ejemplo, admin en una pestaña y mesa en otra), pero **no** entre dos computadoras. Para la junta usa Supabase.

## Páginas

| Ruta | Para quién | Qué es |
| --- | --- | --- |
| `/` | Público | El sitio: cortina, cartelera, paquetes, menú, galería, ubicación |
| `/reservaciones/` | Cliente | Flujo de reserva: día y personas, mapa de mesas, datos, extras, depósito y boleto con QR |
| `/tu-noche/?folio=` | Cliente | Su noche: cuenta regresiva, boleto, mesa, reglas, cómo llegar, playlist, modificar o cancelar |
| `/mesa/?m=12` | Cliente en la cantina | App de la mesa: menú, al micro, dedicatoria, servicio, más (fotos, despechómetro, tarjeta) |
| `/pantalla/` | Teles del bar | Ahora canta, dedicatorias, muro de fotos, cuenta al brindis y QR |
| `/despechometro/` | Público | Quiz con imagen para story |
| `/tarjeta/` | Cliente | La Tarjeta del Despechado (lealtad) |
| `/como-te-fue/?folio=` | Cliente | Calificación: 5 estrellas a Google, 3 o menos privado |
| `/admin/` | Equipo | Hoy, Mapa, Reservas, Micrófono, Llamados, Fotos, Lealtad, Reseñas, Clientes, Reportes, Demo y Ajustes |

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com), crea un proyecto (región **West US** para que quede cerca de El Paso) y espera a que arranque.
2. **SQL Editor > New query**: pega todo `supabase/schema.sql` y dale **Run**. Crea las tablas, las políticas del demo, activa Realtime en las tablas y crea el bucket `fotos` en Storage.
3. Nueva query: pega `supabase/seed.sql` y dale **Run**. Siembra unas 15 reservas (hoy y los próximos días), dedicatorias, turnos al micro, llamados, lista de espera, 10 clientes con sellos, reseñas y fotos. Las fechas son relativas al día en que lo corres.
4. Revisa **Database > Replication** (o **Realtime**): las tablas `reservas`, `lista_espera`, `dedicatorias`, `turnos_micro`, `llamados`, `fotos`, `clientes`, `resenas` y `eventos_pantalla` deben estar en la publicación `supabase_realtime`. El schema ya las agrega.
5. Revisa **Storage**: debe existir el bucket público `fotos`.
6. En **Project Settings > API** copia el **Project URL**, la llave **anon public** y la **service_role** (esta última solo para Vercel, nunca en el navegador).

El botón **Reiniciar demo** del admin llama a la función `reiniciar_demo()`, que borra todo y vuelve a sembrar.

## 2. Variables de entorno en Vercel

En **Vercel > Project > Settings > Environment Variables** (las `VITE_` van al navegador; las demás solo a las funciones):

| Variable | Valor | Para qué |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Project URL de Supabase | Datos y tiempo real |
| `VITE_SUPABASE_ANON_KEY` | llave anon public | Datos y tiempo real |
| `VITE_DEMO_MODE` | `true` | Banner "MODO DEMO · pagos simulados", PIN visible y pestaña Demo |
| `VITE_ADMIN_PIN` | por ejemplo `2468` | PIN del admin |
| `VITE_PAGOS` | `simulado` (demo) o `stripe` | Proveedor de pagos |
| `VITE_APPS_SCRIPT_URL` | la URL `/exec` del Apps Script | Correos (ver `apps-script/README.md`) |
| `STRIPE_SECRET_KEY` | `sk_test_...` o `sk_live_...` | Solo si `VITE_PAGOS=stripe` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Solo si `VITE_PAGOS=stripe` |
| `SUPABASE_SERVICE_ROLE_KEY` | llave service_role | Solo para `/api/checkout` y `/api/stripe-webhook` |
| `SITE_URL` | `https://sinyolandaelpaso.com` | Links de regreso de Stripe |

Después de cambiar variables hay que **volver a desplegar** (Deployments > Redeploy), porque las `VITE_` se meten al construir.

Para desarrollo local copia `.env.example` a `.env.local` y llénalo.

## 3. Guion de la demo para la junta (6 pasos)

Antes: abre `/admin/` en la laptop conectada al proyector (PIN en pantalla), dale **Reiniciar demo** y abre `/pantalla/` en otra pestaña o en la tele. Ten a la mano la pestaña **Demo** con los QR.

1. **"Así reserva tu cliente."** Que alguien escanee el QR de `/reservaciones/` en la pestaña Demo. Escoge día, personas y su mesa en el mapa. Si pide pastel, paga el depósito con `4242 4242 4242 4242`. En el proyector, la reserva aparece al instante en el admin con su toast y sonido. Enséñales el boleto con QR y el botón "Invita a tu bola".
2. **"Así llega el correo."** Admin > Ajustes > **Mandar correo de prueba**: abre en el celular el correo del cliente (boleto, QR, botones, .ics) y el del equipo con **VER EN EL ADMIN**, que abre la reserva resaltada. Dale **Confirmar**: al cliente le llega el correo de confirmación y su página "Tu noche" cambia en vivo.
3. **"Así se vive en la mesa."** Que escaneen el QR de la **mesa 12**. Se apuntan al micro con una canción, mandan una dedicatoria y le dan a **Pedir la cuenta**. En el admin: pestaña Llamados (con el reloj corriendo) y El micrófono. Dale **Siguiente** hasta que en su celular salga **¡TE TOCA!**.
4. **"Así se ve en el bar."** En `/pantalla/` sale AHORA CANTA, la dedicatoria como marquesina de cine y el muro. Que suban una foto desde la mesa (Más > Tu foto a la pantalla), apruébala en Fotos y salta a la pantalla.
5. **El momento wow: el brindis.** Pide que todos tengan la mesa abierta en su celular y dale **🥂 Lanzar brindis** en el admin. Pantallas y celulares cuentan 3, 2, 1 con confeti de papel picado y "¡SALUD, Y SIN LLORAR!" al mismo tiempo.
6. **"Y así crece el negocio."** Prende **Simular noche** para que se vea vivo y recorre Reportes (fuentes de Instagram, TikTok y creadores, ocasiones, canciones), Clientes con sus visitas y cumpleaños, la Tarjeta del Despechado (da un sello y que lo vean llegar a su celular), las reseñas privadas y el Despechómetro para stories.

Al terminar: **Reiniciar demo**.

## 4. Qué falta para producción

- **Auth del admin:** hoy el admin entra con un PIN y lee con la llave anon. Hay que usar **Supabase Auth** (correo y contraseña o magic link) para el equipo.
- **Cerrar las RLS:** las políticas `demo_leer`, `demo_insertar` y `demo_actualizar` de `schema.sql` dejan a cualquiera leer y editar todo. En producción: anon solo puede insertar reservas, turnos, dedicatorias, llamados, fotos y reseñas, y leer lo mínimo (por ejemplo su reserva por folio con una función `security definer`, y la fila del micro sin datos personales); todo lo demás solo para usuarios autenticados del equipo. Quitar `reiniciar_demo()` y `sembrar_demo()`.
- **Stripe real:** cuenta de Stripe del cliente, `VITE_PAGOS=stripe`, `STRIPE_SECRET_KEY`, webhook en `https://DOMINIO/api/stripe-webhook` con `checkout.session.completed` y su `STRIPE_WEBHOOK_SECRET`. Definir política de reembolsos.
- **Plano real de mesas:** reemplazar `src/data/mesas.json` (números, zonas, capacidades y posiciones), correr `npm run seed` y volver a cargar la tabla `mesas`.
- **Precios de los extras** y del paquete en `src/config.js` (`extras` y `deposito`): hoy están marcados como "Por confirmar".
- **Playlist oficial** de Spotify en `CONFIG.playlist.url` y su top 10.
- **Link de reseñas de Google** en `CONFIG.resenaGoogle` (Google Business Profile > Pedir reseñas).
- **Correos:** cuenta de Google Workspace para pasar de 100 a 1,500 correos al día; llenar `TEAM_EMAILS` con el gerente.
- Quitar `VITE_DEMO_MODE` y poner `CONFIG.borrador = false`.
- Pendientes del cliente: teléfono y WhatsApp de la sucursal, menú real con precios, fotos en alta, eventos reales, correo del gerente, dominio (sugerido: sinyolandaelpaso.com), coordenadas, código postal, TikTok y estacionamiento.

## Dónde se edita cada cosa

| Qué | Archivo |
| --- | --- |
| Horario, dirección, links, ocasiones, extras, depósito, playlist, reseñas | `src/config.js` |
| Cartelera de eventos (un evento con `"boleto": 15` cobra boleto por persona) | `src/data/eventos.json` |
| Menú (con `foto` y `top` para la app de la mesa) | `src/data/menu.json` |
| Plano de mesas | `src/data/mesas.json` |
| Datos del demo | `src/plataforma/seed.js` (luego `npm run seed`) |
| Fotos de la galería | `src/data/galeria.json` + `public/assets/fotos/` |
| Correos | `apps-script/Code.gs` |

La cartelera, el menú, la galería y el horario del sitio se pintan **en el HTML al construir** (`build/render.js`), así que Google los indexa aunque se editen desde JSON.

`CONFIG.borrador = true` muestra las etiquetas "Por confirmar" y "Propuesta". Ponlo en `false` antes de publicar.

**Regla de copy:** nada de guiones largos en ningún texto. Usa comas, puntos o dos puntos.

## Estructura

```
index.html                 el sitio (ES)
reservaciones/ tu-noche/ mesa/ pantalla/ admin/
despechometro/ tarjeta/ como-te-fue/
api/checkout.js            Stripe Checkout (Vercel)
api/stripe-webhook.js      marca el depósito como pagado
apps-script/               correos (Code.gs + README)
supabase/schema.sql        tablas, RLS del demo, realtime, storage
supabase/seed.sql          generado por npm run seed
build/render.js            render de JSON/config a HTML en build
src/config.js
src/data/*.json
src/plataforma/
  datos.js                 API única: motor Supabase o local
  disponibilidad.js        horarios y mesas libres
  mapa.js qr.js boleto.js pagos.js correos.js brindis.js lealtad.js
  reservaciones.js tu-noche.js mesa.js pantalla.js
  despechometro.js tarjeta.js como-te-fue.js
  admin/                   admin.js, store.js, acciones.js y las vistas
src/styles/
src/js/                    sitio: cortina, horario
```

## La cortina

- Sale una vez por sesión (`sessionStorage`, clave `sy-cortina`) y nunca con `prefers-reduced-motion`.
- Se decide en un script del `<head>`, antes de pintar. Sin JavaScript no hay cortina.
- Se abre con clic, tap, rueda, swipe, Enter, espacio o flechas. Escape o "Saltar" la quitan al instante.
