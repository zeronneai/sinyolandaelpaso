import { CONFIG } from '../config.js';
import { ENV } from './entorno.js';
import { obtener, listar, actualizar, suscribir } from './datos.js';
import { $, esc, iniciarPlataforma, toast, fechaLarga, hora, linkCalendario, linkWhatsApp, linkUber } from './ui.js';
import { mesaPorId, nombreZona, horariosDelDia, mesasOcupadas } from './disponibilidad.js';
import { pintarMapa } from './mapa.js';
import { htmlBoleto, descargarBoleto, urlTuNoche } from './boleto.js';
import { dinero } from './pagos.js';
import { instanteElPaso } from '../js/horario.js';
import menuData from '../data/menu.json';

iniciarPlataforma({ recargar: () => cargar() });

const folio = new URLSearchParams(location.search).get('folio')?.trim().toUpperCase();
let R = null;
let reloj = null;

const ESTADOS = {
  pendiente: ['Recibida: la cantina te confirma en breve', 'pendiente'],
  confirmada: ['¡Confirmada! Te esperamos', 'confirmada'],
  llego: ['Ya llegaste. ¡A cantar!', 'confirmada'],
  sentada: ['Ya estás en tu mesa. ¡Salud!', 'confirmada'],
  se_fue: ['Gracias por venir', 'fin'],
  no_llego: ['No llegaste... te extrañamos', 'fin'],
  cancelada: ['Reserva cancelada', 'cancelada'],
};

async function cargar() {
  if (!folio) return noEncontrado();
  R = await obtener('reservas', { folio }).catch(() => null);
  if (!R) return noEncontrado();
  $('#cargando').hidden = true;
  $('#contenido').hidden = false;
  await pintar();
}

function noEncontrado() {
  $('#cargando').hidden = true;
  $('#no-encontrado').hidden = false;
  $('#sub').textContent = 'Algo no cuadra con tu link.';
}

async function pintar() {
  const nombre = R.nombre.split(' ')[0];
  $('#titulo').textContent = `La noche de ${nombre}`;
  $('#sub').textContent = `${fechaLarga(R.fecha)} · ${hora(R.hora)}`;
  document.title = `La noche de ${nombre} | Sin Yolanda El Paso`;

  const [txt, clase] = ESTADOS[R.estado] || ESTADOS.pendiente;
  $('#estado').textContent = txt;
  $('#estado').className = `estado-reserva estado-reserva--${clase}`;

  $('#boleto').innerHTML = await htmlBoleto(R);
  $('#guardar-boleto').onclick = () => descargarBoleto(R);
  $('#calendario-link').href = linkCalendario({
    fecha: R.fecha, hora: R.hora, titulo: 'Sin Yolanda El Paso: ¡a cantar!',
    detalles: `Folio ${R.folio}. ${urlTuNoche(R.folio)}`, lugar: '340 Vin Rambla Dr, El Paso, TX',
  });
  $('#invitar').href = linkWhatsApp('', `¡Vente a Sin Yolanda El Paso! 🎤 ${fechaLarga(R.fecha)} a las ${hora(R.hora)}. Esto se va a prender: ${urlTuNoche(R.folio)}`);

  const mesa = mesaPorId(R.mesa_id);
  pintarMapa($('#mapa'), {
    clase: (m) => (m.id === R.mesa_id ? 'elegida' : 'libre'),
    deshabilitada: () => true,
    etiqueta: (m) => (m.id === R.mesa_id ? `Tu mesa, la ${m.numero}` : `Mesa ${m.numero}`),
  });
  const sc = $('.mapa-scroll');
  const g = $(`#mapa [data-mesa="${R.mesa_id}"]`);
  if (g) sc.scrollLeft = Math.max(0, (Number(mesa.x) / 1000) * sc.scrollWidth - sc.clientWidth / 2);
  $('#mesa-texto').innerHTML = mesa
    ? `<strong>Mesa ${mesa.numero}</strong> · ${esc(nombreZona(mesa.zona))}`
    : 'Grupo grande: el host arma su mesa al llegar.';

  const ocasion = CONFIG.ocasiones.find((o) => o.id === R.ocasion)?.es ?? 'Solo vengo a cantar';
  const extras = (R.extras || []).map((x) => CONFIG.extras.find((e) => e.id === x.id)?.nombre).filter(Boolean);
  const dep = { no_aplica: 'Sin depósito', pendiente: 'Pendiente', pagado: 'Pagado', reembolsado: 'Reembolsado', fallido: 'Falló el pago' }[R.deposito_estado];
  $('#datos').innerHTML = `
    <div><dt>Folio</dt><dd class="maquina">${esc(R.folio)}</dd></div>
    <div><dt>Personas</dt><dd>${R.personas}</dd></div>
    <div><dt>Ocasión</dt><dd>${esc(ocasion)}</dd></div>
    ${extras.length ? `<div><dt>Extras</dt><dd>${extras.map(esc).join(', ')}</dd></div>` : ''}
    <div><dt>Depósito</dt><dd>${dep}${R.monto_deposito ? ` · ${dinero(Number(R.monto_deposito))}` : ''}</dd></div>
    ${R.modo_fiesta ? '<div><dt>Modo fiesta</dt><dd>Encendido 🔥</dd></div>' : ''}
    ${R.comentarios ? `<div><dt>Comentarios</dt><dd>${esc(R.comentarios)}</dd></div>` : ''}`;

  if (ENV.demo && !$('#demo-resena')) {
    $('#datos').insertAdjacentHTML('afterend', `<a class="btn btn--rosa btn--ancho" id="demo-resena" style="margin-top:12px" href="/como-te-fue/?folio=${encodeURIComponent(R.folio)}">Demo: simular el "¿Cómo te fue?" del día siguiente</a>`);
  }
  const cerrada = ['cancelada', 'se_fue', 'no_llego'].includes(R.estado);
  $('#modificar').hidden = cerrada;
  $('#cancelar').hidden = cerrada;

  iniciarCuenta();
}

/* ---------- Cuenta regresiva ---------- */
function iniciarCuenta() {
  clearInterval(reloj);
  const objetivo = instanteElPaso(R.fecha, R.hora).getTime();
  const pintarCuenta = () => {
    const ms = objetivo - Date.now();
    if (R.estado === 'cancelada') {
      $('#cuenta').innerHTML = '<span class="cuenta__fin">Cancelada</span>';
      $('#cuenta-frase').textContent = 'Cuando quieras volver, aquí está el micro.';
      return;
    }
    if (ms <= 0) {
      const pasada = ms < -6 * 3600000;
      $('#cuenta').innerHTML = `<span class="cuenta__fin">${pasada ? 'Ya fue' : '¡Es hoy!'}</span>`;
      $('#cuenta-frase').innerHTML = pasada
        ? `¿Cómo te fue? <a href="/como-te-fue/?folio=${encodeURIComponent(R.folio)}">Cuéntanos</a>.`
        : 'Ya deberías estar cantando. ¡Ándale!';
      return;
    }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const caja = (n, t) => `<span><b>${String(n).padStart(2, '0')}</b><small>${t}</small></span>`;
    $('#cuenta').innerHTML = caja(d, d === 1 ? 'día' : 'días') + caja(h, 'horas') + caja(m, 'min') + caja(s, 'seg');
    $('#cuenta-frase').textContent =
      d >= 3 ? 'Ve calentando la garganta.' : d >= 1 ? 'Ya casi. Escoge tu canción.' : h >= 3 ? 'Hoy es la noche. Que no se te olvide el sombrero.' : '¡Ya vete arreglando, que esto se va a prender!';
  };
  pintarCuenta();
  reloj = setInterval(pintarCuenta, 1000);
}

/* ---------- Contenido fijo ---------- */
document.querySelectorAll('.uber-link').forEach((a) => {
  a.href = linkUber();
  a.target = '_blank';
  a.rel = 'noopener';
});
$('#estacionamiento').innerHTML = `${esc(CONFIG.estacionamiento)}${CONFIG.borrador ? ' <span class="etiqueta-borrador">Por confirmar</span>' : ''}`;
$('#top10').innerHTML = CONFIG.playlist.top10.map(([c, a]) => `<li><strong>${esc(c)}</strong> <span>${esc(a)}</span></li>`).join('');
$('#playlist').href = CONFIG.playlist.url;

const platillos = menuData.categorias.flatMap((c) => c.platillos);
$('#pedir').innerHTML = CONFIG.recomendaciones
  .map((n) => platillos.find((p) => p.nombre.es === n))
  .filter(Boolean)
  .map(
    (p, i) => `<li class="pedir__item">
      <svg aria-hidden="true"><use href="#i-${['cantarito', 'corazon', 'micro'][i % 3]}"/></svg>
      <div><strong>${esc(p.nombre.es)}</strong><p>${esc(p.descripcion.es)}</p></div></li>`,
  )
  .join('');

/* ---------- Modificar ---------- */
const hm = $('#hoja-modificar');
let hmPersonas = 2;
async function abrirModificar() {
  hmPersonas = R.personas;
  const mesa = mesaPorId(R.mesa_id);
  const tope = mesa ? mesa.capacidad : 30;
  const delDia = await listar('reservas', { eq: { fecha: R.fecha }, orden: 'hora' });
  const opciones = horariosDelDia(R.fecha).filter((h) => !R.mesa_id || h === R.hora || !mesasOcupadas(delDia, h, { ignorarId: R.id }).has(R.mesa_id));
  if (!opciones.includes(R.hora)) opciones.unshift(R.hora);
  $('#hm-hora').innerHTML = opciones.map((h) => `<option value="${h}" ${h === R.hora ? 'selected' : ''}>${hora(h)}</option>`).join('');
  const pintarP = () => {
    $('#hm-personas').textContent = hmPersonas;
    $('#hm-menos').disabled = hmPersonas <= 1;
    $('#hm-mas').disabled = hmPersonas >= tope;
    $('#hm-ayuda').textContent = mesa ? `Tu mesa es para ${tope} como máximo. Si son más, escríbenos y la cambiamos.` : '';
  };
  $('#hm-menos').onclick = () => { hmPersonas--; pintarP(); };
  $('#hm-mas').onclick = () => { hmPersonas++; pintarP(); };
  pintarP();
  $('#hm-error').hidden = true;
  hm.showModal();
}
hm.addEventListener('close', async () => {
  if (hm.returnValue !== 'guardar') return;
  try {
    R = await actualizar('reservas', R.id, { personas: hmPersonas, hora: $('#hm-hora').value });
    toast('¡Listo! Tu reserva quedó actualizada.', { tipo: 'reserva', icono: 'corazon' });
    pintar();
  } catch (e) {
    toast('No pudimos guardar el cambio. Intenta otra vez.', { tipo: 'error' });
  }
});
$('#modificar').addEventListener('click', abrirModificar);

/* ---------- Cancelar ---------- */
const hc = $('#hoja-cancelar');
$('#cancelar').addEventListener('click', () => hc.showModal());
hc.addEventListener('close', async () => {
  if (hc.returnValue !== 'si') return;
  R = await actualizar('reservas', R.id, { estado: 'cancelada' });
  toast('Cancelada. Aquí te esperamos cuando quieras volver.', { tipo: 'info' });
  pintar();
});

/* ---------- En vivo: si la cantina confirma, se ve aquí ---------- */
suscribir('reservas', ({ nueva }) => {
  if (R && nueva?.id === R.id) {
    const antes = R.estado;
    R = { ...R, ...nueva };
    if (antes !== R.estado && R.estado === 'confirmada') toast('¡La cantina confirmó tu reserva!', { tipo: 'reserva', icono: 'corazon' });
    pintar();
  }
});

cargar();
