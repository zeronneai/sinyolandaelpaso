// ¿Cómo te fue? Con 5 estrellas se manda a Google; con 3 o menos el
// comentario se queda privado para el admin. Así las quejas llegan primero a ellos.

import { CONFIG } from '../config.js';
import { insertar, obtener } from './datos.js';
import { $, esc, iniciarPlataforma, toast } from './ui.js';

iniciarPlataforma();

const folio = new URLSearchParams(location.search).get('folio')?.trim().toUpperCase() || null;
const TEXTOS = ['', 'Uy, no estuvo bien.', 'Pudo estar mejor.', 'Ahí la llevamos.', '¡Estuvo bueno!', '¡Se prendió!'];
let estrellas = 0;

(async () => {
  if (!folio) return;
  const r = await obtener('reservas', { folio }).catch(() => null);
  if (r) $('#sub').textContent = `${r.nombre.split(' ')[0]}, ¿cómo estuvo tu noche en Sin Yolanda?`;
})();

$('#form-resena').addEventListener('change', (e) => {
  if (e.target.name !== 'estrellas') return;
  estrellas = Number(e.target.value);
  $('#estrellas-texto').textContent = TEXTOS[estrellas];
  document.querySelectorAll('.estrellas__fila label').forEach((l, i) => l.classList.toggle('on', i < estrellas));
  $('#enviar').disabled = false;
  const caja = $('#caja-comentario');
  caja.hidden = estrellas === 5;
  if (estrellas <= 3) {
    $('#comentario-label').textContent = '¿Qué pasó? Cuéntanos para arreglarlo';
    $('#comentario-ayuda').textContent = 'Esto solo lo lee el equipo de la cantina.';
  } else {
    $('#comentario-label').textContent = '¿Algo que nos quieras decir? (opcional)';
    $('#comentario-ayuda').textContent = '';
  }
  $('#enviar').textContent = estrellas === 5 ? 'Enviar y dejar reseña en Google' : 'Enviar';
});

$('#form-resena').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!estrellas) return;
  $('#enviar').disabled = true;
  try {
    await insertar('resenas', { folio, estrellas, comentario: $('#comentario').value.trim() || null });
  } catch (er) {
    toast('No pudimos guardar tu calificación. Intenta otra vez.', { tipo: 'error' });
    $('#enviar').disabled = false;
    return;
  }
  $('#form-resena').hidden = true;
  const g = $('#gracias');
  g.hidden = false;
  if (estrellas === 5) {
    g.innerHTML = `<h2 class="tarjeta__titulo">¡Ajúa! Gracias, compa</h2>
      <p>¿Nos ayudas con una reseña en Google? Así más gente se entera de que aquí se prende la fiesta.</p>
      <a class="btn btn--mostaza btn--grande btn--ancho" href="${esc(CONFIG.resenaGoogle)}" target="_blank" rel="noopener">Dejar reseña en Google</a>`;
    setTimeout(() => window.open(CONFIG.resenaGoogle, '_blank', 'noopener'), 900);
  } else if (estrellas === 4) {
    g.innerHTML = `<h2 class="tarjeta__titulo">¡Gracias!</h2><p>Ya casi te dejamos con el cinco. La próxima va por la casa... bueno, el aplauso.</p>
      <a class="btn btn--ancho" href="${esc(CONFIG.resenaGoogle)}" target="_blank" rel="noopener">Dejar reseña en Google</a>`;
  } else {
    g.innerHTML = `<h2 class="tarjeta__titulo">Gracias por decirnos</h2>
      <p>Lo va a leer el equipo hoy mismo. Queremos que la próxima sea de cinco estrellas.</p>
      <a class="btn btn--mostaza btn--ancho" href="/reservaciones/">Darnos otra oportunidad</a>`;
  }
  g.focus();
});
