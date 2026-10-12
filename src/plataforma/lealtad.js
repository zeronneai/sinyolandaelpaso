// La Tarjeta Fiestera: render compartido (página /tarjeta/, admin).

import { esc } from './ui.js';

export const SELLOS_PREMIO = 5;
const CARTAS = [
  ['El Corazón', 'corazon'],
  ['El Micrófono', 'micro'],
  ['El Sombrero', 'sombrero'],
  ['El Cantarito', 'cantarito'],
  ['El Sol', 'sol'],
];

export function htmlTarjeta(cliente) {
  const sellos = Math.min(SELLOS_PREMIO, cliente.sellos || 0);
  const premio = sellos >= SELLOS_PREMIO;
  return `<article class="loteria${premio ? ' loteria--premio' : ''}">
    <header class="loteria__cab">
      <span class="logo loteria__logo" aria-hidden="true"></span>
      <p class="loteria__nombre">${esc(cliente.nombre)}</p>
      <p class="loteria__visitas">${cliente.visitas || 0} ${cliente.visitas === 1 ? 'visita' : 'visitas'}</p>
    </header>
    <ol class="loteria__cartas" aria-label="${sellos} de ${SELLOS_PREMIO} sellos">
      ${CARTAS.map(
        ([t, icono], i) => `<li class="carta${i < sellos ? ' carta--sellada' : ''}">
          <span class="carta__num">${i + 1}</span>
          <svg aria-hidden="true"><use href="#i-${icono}"/></svg>
          <span class="carta__nombre">${t}</span>
          ${i < sellos ? '<span class="carta__sello" aria-label="sellada">¡Ajúa!</span>' : ''}
        </li>`,
      ).join('')}
    </ol>
    ${premio
      ? '<p class="loteria__premio">¡Cantarito de la casa! Enséñale esto a tu mesero.</p>'
      : `<p class="loteria__faltan">Te faltan ${SELLOS_PREMIO - sellos} para tu cantarito de la casa.</p>`}
  </article>`;
}
