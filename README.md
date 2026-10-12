# Sin Yolanda El Paso

Sitio oficial de la sucursal de El Paso, TX. Hecho por Purple Roots Agency.

Vite + HTML/CSS/JS sin framework. GSAP solo para la cortina y las entradas con scroll. Listo para Vercel.

## Correr en local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/
```

`npm run dev` y `npm run build` generan primero las versiones AVIF/WebP de las fotos en `public/img/` (no se suben a git).

## Dónde se edita cada cosa

| Qué | Archivo |
| --- | --- |
| Horario, dirección, teléfono, links, IDs de analítica, URL del Apps Script | `src/config.js` |
| Cartelera de eventos | `src/data/eventos.json` |
| Menú | `src/data/menu.json` |
| Fotos de la galería | `src/data/galeria.json` + `public/assets/fotos/` |
| Logos | `public/assets/logos/` |

La cartelera, el menú, la galería y el horario se pintan **en el HTML al construir** (`build/render.js`), así que Google los indexa aunque se editen desde JSON. En el HTML aparecen como marcadores `<!-- @eventos -->`, `<!-- @menu -->`, etc.

`CONFIG.borrador = true` muestra las etiquetas "Por confirmar" y "Propuesta" en lo que todavía no aprueba el cliente. Ponlo en `false` antes de publicar.

**Regla de copy:** nada de guiones largos en ningún texto. Usa comas, puntos o dos puntos.

## Estructura

```
index.html              página en español (la inglesa llega en la Fase 4)
build/render.js         render de JSON/config a HTML en build
src/config.js
src/data/*.json
src/partials/iconos.svg sprite de iconos de la marca + filtro de aerosol
src/styles/             base, cortina, hero (nav + cinta), secciones
src/js/main.js          cortina, menú móvil, abierto ahora, entradas
src/js/horario.js       lógica de horario (America/Denver)
scripts/optimizar-imagenes.mjs
vercel.json
```

## La cortina

- Sale una vez por sesión (`sessionStorage` con la clave `sy-cortina`) y nunca con `prefers-reduced-motion`.
- La decisión se toma en un script del `<head>`, antes de pintar. Sin JavaScript no hay cortina.
- Se abre con clic, tap, rueda, swipe hacia arriba, Enter, espacio o las flechas. Escape o "Saltar" la quitan al instante.
- Para volver a verla: abre una pestaña nueva o borra `sy-cortina` del sessionStorage.
