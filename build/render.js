// Render del contenido editable (JSON y config) a HTML en tiempo de build.
// Así la cartelera, el menú y el horario viven en el HTML real y Google los indexa,
// pero el cliente los edita en src/data/*.json y src/config.js sin tocar el marcado.

import { readFileSync, readdirSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { DIAS, filasHorario } from '../src/js/horario.js';

const leerJSON = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const T = {
  es: {
    apartar: 'Apartar para este día',
    porConfirmar: 'Por confirmar',
    propuesta: 'Propuesta',
    proximamente: 'Próximamente en el menú',
    precioPendiente: '',
  },
  en: {
    apartar: 'Book this day',
    porConfirmar: 'TBC',
    propuesta: 'Proposal',
    proximamente: 'Coming soon to the menu',
    precioPendiente: '',
  },
};

const GIROS = [-2.2, 1.6, -1.2, 2.4, -1.8];

export function renderEventos(lang = 'es') {
  const { eventos } = leerJSON('../src/data/eventos.json');
  const t = T[lang];
  return eventos
    .map((ev, i) => {
      const etiqueta =
        ev.ejemplo && CONFIG.borrador ? `<span class="etiqueta-borrador">${t.porConfirmar}</span>` : '';
      return `
      <li class="poster poster--${esc(ev.color)}" style="--giro:${GIROS[i % GIROS.length]}deg">
        ${etiqueta}
        <p class="poster__dia">${esc(DIAS[lang][ev.diaSemana])}</p>
        <svg class="poster__icono" aria-hidden="true"><use href="#i-${esc(ev.icono)}"/></svg>
        <h3 class="poster__nombre">${esc(ev.nombre[lang])}</h3>
        <p class="poster__desc">${esc(ev.descripcion[lang])}</p>
        <p class="poster__hora">${esc(ev.horario[lang])}</p>
        <a class="btn btn--chico poster__btn" href="#reservas" data-reservar data-dia="${ev.diaSemana}" data-ocasion="${esc(ev.ocasion)}">${t.apartar}<span class="sr-only">: ${esc(ev.nombre[lang])}</span></a>
      </li>`;
    })
    .join('');
}

export function renderMenu(lang = 'es') {
  const { categorias } = leerJSON('../src/data/menu.json');
  const t = T[lang];
  const nav = categorias
    .map((c) => `<li><a href="#menu-${esc(c.id)}">${esc(c.nombre[lang])}</a></li>`)
    .join('');
  const secciones = categorias
    .map((c) => {
      const items = c.platillos
        .map((p) => {
          if (p.pendiente) {
            return `<li class="platillo platillo--pendiente"><p class="platillo__pendiente">${t.proximamente}</p></li>`;
          }
          const etiqueta =
            p.propuesta && CONFIG.borrador ? ` <span class="etiqueta-borrador">${t.propuesta}</span>` : '';
          const precio = typeof p.precio === 'number' ? `<span class="platillo__precio">$${p.precio}</span>` : '';
          const desc = p.descripcion[lang] ? `<p class="platillo__desc">${esc(p.descripcion[lang])}</p>` : '';
          return `<li class="platillo"><h4 class="platillo__nombre"><span>${esc(p.nombre[lang])}${etiqueta}</span>${precio}</h4>${desc}</li>`;
        })
        .join('');
      return `
      <section class="menu-cat" id="menu-${esc(c.id)}" aria-labelledby="menu-${esc(c.id)}-t">
        <h3 class="menu-cat__titulo" id="menu-${esc(c.id)}-t">${esc(c.nombre[lang])}</h3>
        <ul class="menu-cat__lista">${items}</ul>
      </section>`;
    })
    .join('');
  return `<nav class="menu-nav" aria-label="${lang === 'es' ? 'Categorías del menú' : 'Menu categories'}"><ul>${nav}</ul></nav>
    <div class="menu-grid">${secciones}</div>`;
}

export function renderHorario(lang = 'es') {
  return filasHorario(lang)
    .map(
      (f) =>
        `<tr${f.cerrado ? ' class="cerrado"' : ''} data-dias="${f.dias.join(',')}"><th scope="row">${esc(f.etiqueta)}</th><td>${esc(f.texto)}</td></tr>`,
    )
    .join('');
}

// Arma <picture> con AVIF/WebP desde public/img (lo genera scripts/optimizar-imagenes.mjs).
function picture(archivo, alt, { sizes, clase = '', carga = 'lazy' } = {}) {
  const base = archivo.replace(/\.[^.]+$/, '');
  let generadas = [];
  try {
    generadas = readdirSync(new URL('../public/img/', import.meta.url));
  } catch {}
  const srcset = (formato) =>
    generadas
      .map((f) => f.match(new RegExp(`^${base}-(\\d+)\\.${formato}$`)))
      .filter(Boolean)
      .sort((a, b) => a[1] - b[1])
      .map((m) => `/img/${m[0]} ${m[1]}w`)
      .join(', ');
  const fuentes = ['avif', 'webp']
    .map((f) => [f, srcset(f)])
    .filter(([, s]) => s)
    .map(([f, s]) => `<source type="image/${f}" srcset="${s}" sizes="${sizes}">`)
    .join('');
  return `<picture>${fuentes}<img src="/assets/fotos/${esc(archivo)}" alt="${esc(alt)}" class="${clase}" loading="${carga}" decoding="async"></picture>`;
}

export function renderGaleria(lang = 'es') {
  const { fotos } = leerJSON('../src/data/galeria.json');
  return fotos
    .map(
      (f) =>
        `<li class="galeria__item${f.grande ? ' galeria__item--grande' : ''}${f.alto ? ' galeria__item--alto' : ''}${f.abajo ? ' galeria__item--abajo' : ''}">${picture(
          f.archivo,
          f.alt[lang],
          { sizes: f.grande ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 50vw' },
        )}</li>`,
    )
    .join('');
}

export function renderBorrador(lang = 'es') {
  return CONFIG.borrador ? `<span class="etiqueta-borrador">${T[lang].porConfirmar}</span>` : '';
}

export function renderIconos() {
  return readFileSync(new URL('../src/partials/iconos.svg', import.meta.url), 'utf8');
}

/** Reemplaza los marcadores <!-- @nombre --> del HTML. */
export function renderHTML(html, lang) {
  const bloques = {
    iconos: renderIconos,
    eventos: renderEventos,
    menu: renderMenu,
    horario: renderHorario,
    galeria: renderGaleria,
    borrador: renderBorrador,
  };
  return html.replace(/<!--\s*@(\w+)\s*-->/g, (m, nombre) => (bloques[nombre] ? bloques[nombre](lang) : m));
}
