// Mapa de mesas en SVG, compartido por reservaciones, tu noche y el admin.

import { PLANO, nombreZona } from './disponibilidad.js';
import { esc } from './ui.js';

const TAM = {
  redonda: (c) => ({ r: 26 + c * 2.2 }),
  periquera: (c) => ({ r: 20 + c * 2.5 }),
  cuadrada: (c) => ({ w: 52 + c * 4, h: 52 + c * 4 }),
  rectangular: (c) => ({ w: 70 + c * 6, h: 56 }),
};

function forma(m) {
  const t = (TAM[m.forma] || TAM.redonda)(m.capacidad);
  if (t.r) return `<circle class="mesa__forma" cx="${m.x}" cy="${m.y}" r="${t.r}"/>`;
  return `<rect class="mesa__forma" x="${m.x - t.w / 2}" y="${m.y - t.h / 2}" width="${t.w}" height="${t.h}" rx="10"/>`;
}

/**
 * Pinta el mapa dentro de `contenedor`.
 * - clase(mesa) -> 'libre' | 'ocupada' | 'elegida' | 'chica' | cualquier clase extra
 * - etiqueta(mesa) -> texto accesible de la mesa
 * - onElegir(mesa) -> se llama al tocar una mesa que no esté deshabilitada
 * - deshabilitada(mesa) -> boolean
 */
export function pintarMapa(contenedor, { clase = () => 'libre', etiqueta, onElegir, deshabilitada = () => false, extra } = {}) {
  const deco = PLANO.decoracion
    .map(
      (d) => `<g class="deco deco--${d.tipo}"><rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="14"/>
      <text x="${d.x + d.w / 2}" y="${d.y + d.h / 2}"${d.tipo === 'barra' ? ` transform="rotate(-90 ${d.x + d.w / 2} ${d.y + d.h / 2})"` : ''}>${esc(d.texto)}</text></g>`,
    )
    .join('');

  const mesas = PLANO.mesas
    .map((m) => {
      const off = deshabilitada(m);
      const texto = etiqueta ? etiqueta(m) : `Mesa ${m.numero}, ${nombreZona(m.zona)}, ${m.capacidad} personas`;
      return `<g class="mesa mesa--${clase(m)}" data-mesa="${m.id}" role="button" tabindex="${off ? -1 : 0}"
          aria-label="${esc(texto)}" aria-disabled="${off}">
        ${forma(m)}
        <text x="${m.x}" y="${m.y - 6}">${m.numero}</text>
        <text class="mesa__cap" x="${m.x}" y="${m.y + 15}">${m.capacidad} p</text>
        ${extra ? extra(m) : ''}
      </g>`;
    })
    .join('');

  contenedor.innerHTML = `<svg class="mapa-mesas" viewBox="0 0 ${PLANO.ancho} ${PLANO.alto}" role="group" aria-label="Mapa de mesas">
    ${deco}${mesas}</svg>`;

  if (onElegir) {
    const elegir = (g) => {
      if (!g || g.getAttribute('aria-disabled') === 'true') return;
      onElegir(PLANO.mesas.find((m) => m.id === Number(g.dataset.mesa)));
    };
    contenedor.onclick = (e) => elegir(e.target.closest('.mesa'));
    contenedor.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elegir(e.target.closest('.mesa'));
      }
    };
  }
}
