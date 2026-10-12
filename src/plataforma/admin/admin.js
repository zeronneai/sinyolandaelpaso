import { ENV } from '../entorno.js';
import { iniciarPlataforma, toast, sonar, $, esc, fechaLarga, fechaCorta, hora } from '../ui.js';
import { iniciarStore, alCambiar } from './store.js';
import { lanzarBrindis, escucharBrindis, brindisAutomatico } from '../brindis.js';
import { VISTAS_OPERACION, destacarReserva } from './vistas-operacion.js';
import { VISTAS_AJUSTES } from './vistas-ajustes.js';
import { VISTAS_DEMO } from './vistas-demo.js';
import { VISTAS_EXTRA } from './vistas-extra.js';
import { esPropio } from './acciones.js';
import { hoyEnElPaso } from '../../js/horario.js';

const VISTAS = [...VISTAS_OPERACION, ...VISTAS_EXTRA, ...VISTAS_DEMO, ...VISTAS_AJUSTES];

/* ============================================================
   Acceso con PIN
   ============================================================ */
const CLAVE_SESION = 'sy-admin';
const dentro = () => {
  try { return sessionStorage.getItem(CLAVE_SESION) === '1'; } catch (e) { return false; }
};

function mostrarLogin() {
  $('#login').hidden = false;
  if (ENV.demo) {
    $('#login-demo').hidden = false;
    $('#login-demo').innerHTML = `Modo demo: el PIN es <strong>${esc(ENV.adminPin)}</strong>`;
  }
  $('#pin').focus();
  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#pin').value === ENV.adminPin) {
      try { sessionStorage.setItem(CLAVE_SESION, '1'); } catch (er) {}
      $('#login').hidden = true;
      arrancar();
    } else {
      $('#login-error').hidden = false;
      $('#pin').select();
    }
  });
}

/* ============================================================
   App
   ============================================================ */
let vistaActual = null;
let sonidoOn = (() => { try { return localStorage.getItem('sy-admin-sonido') !== '0'; } catch (e) { return true; } })();

// Barra inferior en celular: las 4 vistas que más se usan en servicio + "Más".
const PRINCIPALES = ['hoy', 'mapa', 'micro', 'llamados'];
const CORTOS = { hoy: 'Hoy', mapa: 'Mapa', micro: 'Micro', llamados: 'Llamados' };
const badgeHTML = (v) => (v.badge?.() ? `<b class="badge${v.badgeAlerta ? ' badge--alerta' : ''}">${v.badge()}</b>` : '');

function pintarTabbar() {
  const otras = VISTAS.filter((v) => !PRINCIPALES.includes(v.id));
  const enMas = otras.some((v) => v.id === vistaActual?.id);
  const pendientesMas = otras.reduce((n, v) => n + (Number(v.badge?.()) || 0), 0);
  $('#tabbar').innerHTML = PRINCIPALES.map((id) => VISTAS.find((v) => v.id === id)).filter(Boolean).map(
    (v) => `<button type="button" class="tab" data-vista="${v.id}" aria-current="${vistaActual?.id === v.id ? 'page' : 'false'}">
      <span class="tab__ico"><svg aria-hidden="true"><use href="#i-${v.icono}"/></svg>${badgeHTML(v)}</span><span class="tab__t">${CORTOS[v.id] || esc(v.titulo)}</span></button>`,
  ).join('') + `<button type="button" class="tab" id="tab-mas" aria-current="${enMas ? 'page' : 'false'}" aria-haspopup="dialog">
      <span class="tab__ico"><span class="tab__puntos" aria-hidden="true">•••</span>${pendientesMas ? `<b class="badge">${pendientesMas}</b>` : ''}</span><span class="tab__t">${enMas ? esc(vistaActual.titulo) : 'Más'}</span></button>`;
  $('#mas-lista').innerHTML = otras.map(
    (v) => `<li><button type="button" class="mas__item" data-vista="${v.id}" aria-current="${vistaActual?.id === v.id ? 'page' : 'false'}">
      <svg aria-hidden="true"><use href="#i-${v.icono}"/></svg><span>${esc(v.titulo)}</span>${badgeHTML(v)}</button></li>`,
  ).join('');
}

function pintarNav() {
  pintarTabbar();
  $('#nav').innerHTML = VISTAS.map(
    (v) => `<li><button type="button" class="lateral__item" data-vista="${v.id}" aria-current="${vistaActual?.id === v.id ? 'page' : 'false'}">
      <svg aria-hidden="true"><use href="#i-${v.icono}"/></svg><span>${esc(v.titulo)}</span>
      ${v.badge?.() ? `<b class="badge${v.badgeAlerta ? ' badge--alerta' : ''}">${v.badge()}</b>` : ''}</button></li>`,
  ).join('');
}

function ir(id) {
  const v = VISTAS.find((x) => x.id === id) || VISTAS[0];
  vistaActual?.desmontar?.();
  vistaActual = v;
  $('#cab-titulo').textContent = v.titulo;
  // Nodo nuevo en cada vista para no acumular listeners.
  const viejo = $('#vista');
  const el = viejo.cloneNode(false);
  viejo.replaceWith(el);
  el.className = `vista vista--${v.id}`;
  v.montar(el);
  pintarNav();
  history.replaceState(null, '', `#${v.id}`);
}

$('#tabbar').addEventListener('click', (e) => {
  if (e.target.closest('#tab-mas')) { $('#mas').showModal(); return; }
  const b = e.target.closest('[data-vista]');
  if (b) { ir(b.dataset.vista); window.scrollTo({ top: 0 }); }
});
$('#mas-lista').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]');
  if (b) { $('#mas').close(); ir(b.dataset.vista); window.scrollTo({ top: 0 }); }
});
$('#mas-cerrar').addEventListener('click', () => $('#mas').close());
$('#mas').addEventListener('click', (e) => { if (e.target === $('#mas')) $('#mas').close(); });
$('#mas-sonido').addEventListener('click', () => $('#sonido').click());
$('#mas-salir').addEventListener('click', () => $('#salir').click());

$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]');
  if (b) ir(b.dataset.vista);
});

/* ---------- Toasts por tipo ---------- */
const TOAST = {
  reservas: (r, tipo, vieja) => {
    if (tipo === 'INSERT') {
      return r.source === 'walk-in'
        ? [`Walk-in: ${esc(r.nombre)} en la mesa ${r.mesa_id}`, 'reserva', 'sombrero']
        : [`Nueva reserva: <b>${esc(r.nombre)}</b>, ${r.personas} p · ${fechaCorta(r.fecha)} ${hora(r.hora)}`, 'reserva', 'corazon'];
    }
    if (vieja && r.estado === 'cancelada' && vieja.estado !== 'cancelada') return [`${esc(r.nombre)} canceló su reserva`, 'llamado', 'llama'];
    if (vieja && (r.hora !== vieja.hora || r.personas !== vieja.personas)) return [`${esc(r.nombre)} modificó su reserva: ${r.personas} p · ${hora(r.hora)}`, 'reserva', 'corazon'];
    if (vieja && r.deposito_estado === 'pagado' && vieja.deposito_estado !== 'pagado') return [`Depósito pagado: ${esc(r.nombre)}`, 'reserva', 'corazon'];
    return null;
  },
  dedicatorias: (d, tipo) => tipo === 'INSERT' && [`Dedicatoria de la mesa ${d.mesa}: "${esc(d.cancion)}" para ${esc(d.para)}`, 'dedicatoria', 'corazon'],
  turnos_micro: (t, tipo) => tipo === 'INSERT' && [`Mesa ${t.mesa} se apuntó al micro: ${esc(t.cancion)}`, 'turno', 'micro'],
  llamados: (l, tipo) =>
    tipo === 'INSERT' && [`Mesa ${l.mesa} ${{ cuenta: 'pide la cuenta', mesero: 'llama al mesero', ayuda: 'necesita ayuda' }[l.tipo]}`, 'llamado', 'cantarito'],
  fotos: (f, tipo) => tipo === 'INSERT' && [`Mesa ${f.mesa ?? '?'} mandó una foto para la pantalla`, 'foto', 'sol'],
  resenas: (r, tipo) => tipo === 'INSERT' && [`Nueva reseña: ${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}`, 'resena', 'destello'],
  lista_espera: (e, tipo) => tipo === 'INSERT' && [`${esc(e.nombre)} se anotó en la lista de espera (${e.personas} p)`, 'turno', 'sombrero'],
};

function alCambio(cambio) {
  if (cambio.tipo !== 'CARGA' && !esPropio(cambio)) {
    const t = TOAST[cambio.tabla]?.(cambio.nueva, cambio.tipo, cambio.vieja);
    if (t) {
      toast(t[0], { tipo: t[1], icono: t[2] });
      if (sonidoOn) sonar(cambio.tabla === 'llamados' ? 'alerta' : 'ding');
      pulsoEnVivo();
    }
  }
  vistaActual?.actualizar?.(cambio);
  pintarNav();
}

function pulsoEnVivo() {
  const e = $('#en-vivo');
  e.classList.remove('en-vivo--pulso');
  void e.offsetWidth;
  e.classList.add('en-vivo--pulso');
}

/* ---------- Cabecera ---------- */
function reloj() {
  const t = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
  $('#reloj').textContent = `${t} en El Chuco`;
  $('#cab-fecha').textContent = fechaLarga(hoyEnElPaso());
}

$('#sonido').addEventListener('click', () => {
  sonidoOn = !sonidoOn;
  try { localStorage.setItem('sy-admin-sonido', sonidoOn ? '1' : '0'); } catch (e) {}
  $('#sonido').setAttribute('aria-pressed', String(sonidoOn));
  $('#sonido').textContent = sonidoOn ? '🔔 Sonido' : '🔕 Silencio';
  $('#mas-sonido').textContent = $('#sonido').textContent;
  if (sonidoOn) sonar('ding');
});
$('#salir').addEventListener('click', () => {
  try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
  location.reload();
});
$('#btn-brindis').addEventListener('click', async () => {
  await lanzarBrindis('admin');
  toast('¡Brindis lanzado a todas las pantallas y mesas!', { tipo: 'reserva', icono: 'destello' });
});

async function arrancar() {
  $('#app').hidden = false;
  $('#tabbar').hidden = false;
  $('#mas-sonido').textContent = sonidoOn ? '🔔 Sonido' : '🔕 Silencio';
  $('#sonido').setAttribute('aria-pressed', String(sonidoOn));
  $('#sonido').textContent = sonidoOn ? '🔔 Sonido' : '🔕 Silencio';
  reloj();
  setInterval(reloj, 15000);
  alCambiar(alCambio);
  escucharBrindis({ conSonido: false });
  brindisAutomatico(() => lanzarBrindis('automatico'));
  await iniciarStore();
  // Link del correo al equipo: /admin/?reserva=FOLIO abre esa reserva resaltada.
  const folio = new URLSearchParams(location.search).get('reserva');
  if (folio) {
    destacarReserva(folio.trim().toUpperCase());
    ir('reservas');
    document.querySelector('#res-destacada')?.scrollIntoView({ block: 'start' });
  } else ir(location.hash.slice(1) || 'hoy');
}

iniciarPlataforma();
if (dentro()) arrancar();
else mostrarLogin();
