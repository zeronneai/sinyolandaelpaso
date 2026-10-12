import { CONFIG } from '../config.js';
import { listar, insertar, suscribir, guardarCliente, normalizarTelefono, nuevoFolio } from './datos.js';
import {
  $, $$, esc, iniciarPlataforma, toast, fechaLarga, fechaCorta, hora, sumarDias,
  linkCalendario, linkWhatsApp, track, fuente, DIAS_ES, MESES_ES,
} from './ui.js';
import {
  fechaReservable, horariosConCupo, mesasOcupadas, mesasLibres, nombreZona, mesaPorId,
  ZONAS, MAX_POR_MESA, MAX_PERSONAS, DIAS_ADELANTE,
} from './disponibilidad.js';
import { pintarMapa } from './mapa.js';
import { cobrar, dinero, proveedor } from './pagos.js';
import { htmlBoleto, descargarBoleto, urlTuNoche } from './boleto.js';
import { hoyEnElPaso } from '../js/horario.js';
import { mandarCorreo } from './correos.js';
import eventosData from '../data/eventos.json';

iniciarPlataforma({ recargar: () => cargarReservasDelDia() });

/* ============================================================
   Estado
   ============================================================ */
const params = new URLSearchParams(location.search);
const S = {
  paso: 1,
  fecha: null,
  hora: null,
  personas: Math.min(MAX_PERSONAS, Math.max(1, Number(params.get('personas')) || 2)),
  mesa: null,
  zonaPref: null,
  ocasion: params.get('ocasion') || 'cantar',
  extras: new Set(),
  reservasDelDia: [],
  mesCal: null, // 'YYYY-MM'
  inicioForm: Date.now(),
  reserva: null,
};
const pf = params.get('fecha');
if (pf && fechaReservable(pf)) S.fecha = pf;

/* ============================================================
   Navegación entre pasos
   ============================================================ */
const PASOS_VISIBLES = 5;
function ir(paso) {
  S.paso = paso;
  $$('.paso').forEach((s) => (s.hidden = s.id !== `paso-${paso}`));
  $$('.progreso li').forEach((li) => {
    const n = Number(li.dataset.paso);
    li.classList.toggle('hecho', n < paso);
    li.classList.toggle('actual', n === paso);
    if (n === paso) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
  $('.progreso').hidden = paso > PASOS_VISIBLES;
  $('.progreso__barra span').style.width = `${(Math.min(paso, PASOS_VISIBLES) / PASOS_VISIBLES) * 100}%`;
  if (paso === 2) {
    pintarPaso2();
    // centra el plano en el escenario
    const sc = $('.mapa-scroll');
    sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
  }
  if (paso === 4) pintarExtras();
  if (paso === 5) pintarDeposito();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $(`#paso-${paso} h2`)?.focus?.({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ir]');
  if (b && !b.disabled) ir(Number(b.dataset.ir));
});

/* ============================================================
   Paso 1: calendario, personas y horarios con cupo real
   ============================================================ */
const hoy = hoyEnElPaso();
S.mesCal = (S.fecha || hoy).slice(0, 7);

function pintarCalendario() {
  const [y, m] = S.mesCal.split('-').map(Number);
  const primero = new Date(Date.UTC(y, m - 1, 1));
  const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const limite = sumarDias(hoy, DIAS_ADELANTE);
  const puedeAtras = S.mesCal > hoy.slice(0, 7);
  const puedeAdelante = S.mesCal < limite.slice(0, 7);

  let celdas = '';
  for (let i = 0; i < primero.getUTCDay(); i++) celdas += '<span></span>';
  for (let d = 1; d <= dias; d++) {
    const f = `${S.mesCal}-${String(d).padStart(2, '0')}`;
    const ok = fechaReservable(f);
    const dow = new Date(`${f}T12:00:00Z`).getUTCDay();
    const cerrado = !CONFIG.horario[dow];
    const clases = ['dia', ok ? '' : 'dia--off', cerrado ? 'dia--cerrado' : '', f === hoy ? 'dia--hoy' : '', f === S.fecha ? 'dia--elegido' : ''].join(' ');
    celdas += `<button type="button" class="${clases}" data-fecha="${f}" ${ok ? '' : 'disabled'}
      aria-pressed="${f === S.fecha}" aria-label="${fechaLarga(f)}${cerrado ? ', cerrado' : ok ? '' : ', no disponible'}">${d}</button>`;
  }
  $('#calendario').innerHTML = `
    <div class="cal__cabeza">
      <button type="button" class="cal__nav" data-mes="-1" ${puedeAtras ? '' : 'disabled'} aria-label="Mes anterior">‹</button>
      <p class="cal__mes" aria-live="polite">${MESES_ES[m - 1]} ${y}</p>
      <button type="button" class="cal__nav" data-mes="1" ${puedeAdelante ? '' : 'disabled'} aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal__semana" aria-hidden="true">${DIAS_ES.map((d) => `<span>${d.slice(0, 2)}</span>`).join('')}</div>
    <div class="cal__dias">${celdas}</div>`;
}

$('#calendario').addEventListener('click', (e) => {
  const nav = e.target.closest('[data-mes]');
  if (nav) {
    const [y, m] = S.mesCal.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + Number(nav.dataset.mes), 1));
    S.mesCal = d.toISOString().slice(0, 7);
    pintarCalendario();
    return;
  }
  const b = e.target.closest('[data-fecha]');
  if (b && !b.disabled) {
    S.fecha = b.dataset.fecha;
    S.hora = null;
    S.mesa = null;
    pintarCalendario();
    cargarReservasDelDia();
  }
});

async function cargarReservasDelDia() {
  if (!S.fecha) return pintarHoras();
  $('#horas').innerHTML = '<p class="vacio">Viendo qué mesas quedan...</p>';
  try {
    S.reservasDelDia = await listar('reservas', { eq: { fecha: S.fecha }, orden: 'hora' });
  } catch (e) {
    S.reservasDelDia = [];
    toast('No pudimos ver la disponibilidad. Intenta otra vez.', { tipo: 'error' });
  }
  pintarHoras();
  if (S.paso === 2) pintarPaso2();
}

function pintarHoras() {
  const cont = $('#horas');
  if (!S.fecha) {
    cont.innerHTML = '<p class="vacio">Primero escoge el día.</p>';
    actualizarP1();
    return;
  }
  const lista = horariosConCupo(S.fecha, S.reservasDelDia, S.personas);
  if (!lista.length) {
    cont.innerHTML = '<p class="vacio">Ya no quedan horarios para este día. Escoge otro.</p>';
  } else {
    if (S.hora && lista.find((h) => h.hora === S.hora)?.lleno) S.hora = null;
    cont.innerHTML = lista
      .map(
        (h) => `<label class="chip chip--hora${h.lleno ? ' chip--lleno' : ''}">
          <input type="radio" name="hora" value="${h.hora}" ${h.lleno ? 'disabled' : ''} ${h.hora === S.hora ? 'checked' : ''}>
          <span>${hora(h.hora)}${h.lleno ? '<em>Ya se llenó, compa</em>' : ''}</span></label>`,
      )
      .join('');
  }
  actualizarP1();
}
$('#horas').addEventListener('change', (e) => {
  S.hora = e.target.value;
  S.mesa = null;
  actualizarP1();
});

function pintarPersonas() {
  $('#personas').innerHTML = `${S.personas}<small>${S.personas === 1 ? 'persona' : 'personas'}</small>`;
  $('#menos').disabled = S.personas <= 1;
  $('#mas').disabled = S.personas >= MAX_PERSONAS;
  $('#aviso-grupo').hidden = S.personas <= 12;
}
const cambiarPersonas = (d) => {
  S.personas = Math.min(MAX_PERSONAS, Math.max(1, S.personas + d));
  if (S.mesa && S.mesa.capacidad < S.personas) S.mesa = null;
  pintarPersonas();
  pintarHoras();
};
$('#menos').addEventListener('click', () => cambiarPersonas(-1));
$('#mas').addEventListener('click', () => cambiarPersonas(1));

function actualizarP1() {
  $('#p1-sig').disabled = !(S.fecha && S.hora);
}

/* ============================================================
   Paso 2: mapa de mesas
   ============================================================ */
const esGrupoGrande = () => S.personas > MAX_POR_MESA;

function pintarPaso2() {
  $('#p2-resumen').textContent = `${fechaLarga(S.fecha)} · ${hora(S.hora)} · ${S.personas} ${S.personas === 1 ? 'persona' : 'personas'}`;
  const ocupadas = mesasOcupadas(S.reservasDelDia, S.hora);
  const grande = esGrupoGrande();
  $('#grupo-grande').hidden = !grande;
  $('.tarjeta--mapa').classList.toggle('tarjeta--atenuada', grande);

  if (S.mesa && (ocupadas.has(S.mesa.id) || S.mesa.capacidad < S.personas)) {
    toast(`Alguien te ganó la mesa ${S.mesa.numero}. Escoge otra.`, { tipo: 'error' });
    S.mesa = null;
  }

  pintarMapa($('#mapa'), {
    clase: (m) => (S.mesa?.id === m.id ? 'elegida' : ocupadas.has(m.id) ? 'ocupada' : m.capacidad < S.personas ? 'chica' : 'libre'),
    deshabilitada: (m) => grande || ocupadas.has(m.id) || m.capacidad < S.personas,
    etiqueta: (m) =>
      `Mesa ${m.numero}, ${nombreZona(m.zona)}, hasta ${m.capacidad} personas, ${
        ocupadas.has(m.id) ? 'ocupada' : m.capacidad < S.personas ? 'muy chica para tu grupo' : 'libre'
      }`,
    onElegir: (m) => {
      S.mesa = m;
      pintarPaso2();
      $(`#mapa [data-mesa="${m.id}"]`)?.focus();
    },
  });

  if (grande) {
    $('#zona-pref').innerHTML = [...Object.entries(ZONAS), ['me-da-igual', { es: 'Me da igual' }]]
      .map(([id, z]) => `<label class="chip"><input type="radio" name="zona" value="${id}" ${S.zonaPref === id ? 'checked' : ''}><span>${esc(z.es)}</span></label>`)
      .join('');
    $('#mesa-elegida').textContent = '';
  } else {
    $('#mesa-elegida').innerHTML = S.mesa
      ? `<strong>Mesa ${S.mesa.numero}</strong> · ${esc(nombreZona(S.mesa.zona))} · hasta ${S.mesa.capacidad} personas`
      : `Toca una mesa libre. Quedan ${mesasLibres(S.reservasDelDia, S.hora, S.personas).length} para tu grupo.`;
  }
  $('#p2-sig').disabled = grande ? !S.zonaPref : !S.mesa;
}
$('#zona-pref').addEventListener('change', (e) => {
  S.zonaPref = e.target.value;
  $('#p2-sig').disabled = false;
});

/* ============================================================
   Paso 3: datos
   ============================================================ */
$('#ocasiones').innerHTML = CONFIG.ocasiones
  .map((o) => `<label class="chip"><input type="radio" name="ocasion" value="${o.id}" ${o.id === S.ocasion ? 'checked' : ''}><span>${esc(o.es)}</span></label>`)
  .join('');
$('#ocasiones').addEventListener('change', (e) => (S.ocasion = e.target.value));
$('#comentarios').addEventListener('input', (e) => ($('#contador').textContent = `${e.target.value.length}/500`));

const VALIDAR = {
  nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
  correo: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa tu correo, compa.'),
  telefono: (v) => {
    const d = v.replace(/\D/g, '');
    return d.length === 10 || (d.length === 11 && d.startsWith('1')) || (d.length >= 12 && d.length <= 13 && d.startsWith('52'))
      ? ''
      : 'Pon un número de 10 dígitos (EE. UU.) o con +52 (México).';
  },
  privacidad: (_, el) => (el.checked ? '' : 'Necesitamos que aceptes el aviso de privacidad.'),
};
function validarDatos() {
  let primero = null;
  for (const [campo, fn] of Object.entries(VALIDAR)) {
    const el = $(`#${campo}`);
    const msg = fn(el.value, el);
    const caja = el.closest('.campo');
    caja.querySelector('.campo__error')?.remove();
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      const p = document.createElement('p');
      p.className = 'campo__error';
      p.id = `${campo}-error`;
      p.textContent = msg;
      caja.append(p);
      el.setAttribute('aria-describedby', p.id);
      primero ||= el;
    } else el.removeAttribute('aria-describedby');
  }
  primero?.focus();
  return !primero;
}
$('#p3-sig').addEventListener('click', () => validarDatos() && ir(4));

/* ============================================================
   Paso 4: extras y cálculo del depósito
   ============================================================ */
function pintarExtras() {
  if (!$('#extras').children.length) {
    $('#extras').innerHTML = CONFIG.extras
      .map(
        (x) => `<label class="extra">
        <input type="checkbox" value="${x.id}" ${S.extras.has(x.id) ? 'checked' : ''}>
        <svg class="extra__icono" aria-hidden="true"><use href="#i-${x.icono}"/></svg>
        <span class="extra__texto"><strong>${esc(x.nombre)}</strong><small>${esc(x.detalle)}</small></span>
        <span class="extra__precio">+${dinero(x.precio)}${CONFIG.borrador ? '<em>Por confirmar</em>' : ''}</span>
      </label>`,
      )
      .join('');
    $('#extras').addEventListener('change', (e) => {
      if (e.target.checked) S.extras.add(e.target.value);
      else S.extras.delete(e.target.value);
      pintarTotal();
    });
  }
  pintarTotal();
}

function conceptosDeposito() {
  const items = [];
  if (CONFIG.deposito.paquetes.includes(S.ocasion)) {
    const o = CONFIG.ocasiones.find((x) => x.id === S.ocasion);
    items.push({ nombre: `Paquete ${o.es}`, monto: CONFIG.deposito.montoPaquete });
  }
  const dow = new Date(`${S.fecha}T12:00:00Z`).getUTCDay();
  for (const ev of eventosData.eventos) {
    if (ev.diaSemana === dow && typeof ev.boleto === 'number') {
      items.push({ nombre: `Boleto ${ev.nombre.es} x ${S.personas}`, monto: ev.boleto * S.personas });
    }
  }
  for (const id of S.extras) {
    const x = CONFIG.extras.find((e) => e.id === id);
    items.push({ nombre: x.nombre, monto: x.precio });
  }
  return items;
}
const totalDeposito = () => conceptosDeposito().reduce((s, i) => s + i.monto, 0);

function pintarTotal() {
  const items = conceptosDeposito();
  const total = totalDeposito();
  $('#total-extras').innerHTML = total
    ? `<p><strong>Depósito: ${dinero(total)}</strong></p><p class="ayuda">Se descuenta de tu cuenta esa noche. ${items.map((i) => esc(i.nombre)).join(', ')}.</p>`
    : '<p><strong>Sin depósito.</strong> Tu mesa queda apartada sin pagar nada.</p>';
  $('#p4-sig').textContent = total ? `Siguiente: depósito de ${dinero(total)}` : 'Apartar mi mesa';
}

$('#p4-sig').addEventListener('click', async () => {
  if (totalDeposito() > 0) return ir(5);
  await crearReserva({ deposito_estado: 'no_aplica', monto_deposito: 0 }, $('#p4-sig'), $('#p4-error'));
});

/* ============================================================
   Paso 5: depósito
   ============================================================ */
function pintarDeposito() {
  const items = conceptosDeposito();
  $('#resumen-deposito').innerHTML = `
    <h3 class="tarjeta__titulo">Resumen</h3>
    <ul class="lista-resumen" role="list">
      <li><span>${esc(fechaLarga(S.fecha))} · ${hora(S.hora)}</span><span>${S.personas} p</span></li>
      ${items.map((i) => `<li><span>${esc(i.nombre)}</span><span>${dinero(i.monto)}</span></li>`).join('')}
      <li class="lista-resumen__total"><span>Depósito</span><span>${dinero(totalDeposito())}</span></li>
    </ul>
    <p class="ayuda">${proveedor === 'simulado' ? 'Modo demo: el pago es simulado y no se cobra nada.' : 'Pago seguro con Stripe. Se descuenta de tu cuenta esa noche.'}</p>`;
  $('#p5-pagar').textContent = `Pagar depósito de ${dinero(totalDeposito())}`;
}

$('#p5-pagar').addEventListener('click', async () => {
  const btn = $('#p5-pagar');
  const monto = totalDeposito();
  if (proveedor === 'stripe') {
    // Con Stripe se guarda primero y el webhook marca el depósito como pagado.
    const r = await crearReserva({ deposito_estado: 'pendiente', monto_deposito: monto }, btn, $('#p5-error'), { mostrar: false });
    if (r) await cobrar({ folio: r.folio, monto, concepto: `Depósito Sin Yolanda ${r.folio}`, correo: r.correo }).catch((e) => mostrarError($('#p5-error'), e.message));
    return;
  }
  const pago = await cobrar({ monto, concepto: `Depósito · ${fechaCorta(S.fecha)} · ${S.personas} personas`, correo: $('#correo').value, nombre: $('#nombre').value });
  if (!pago.ok) return;
  await crearReserva({ deposito_estado: 'pagado', monto_deposito: monto, estado: 'confirmada' }, btn, $('#p5-error'));
});

/* ============================================================
   Crear la reserva
   ============================================================ */
function mostrarError(el, msg) {
  el.innerHTML = `${esc(msg)} Si sigue fallando, aparta por <a href="${CONFIG.links.opentable}" target="_blank" rel="noopener">OpenTable</a>.`;
  el.hidden = false;
}

async function crearReserva(pago, btn, errorEl, { mostrar = true } = {}) {
  errorEl.hidden = true;
  // Antispam: honeypot y mínimo 3 segundos.
  if ($('#sitio').value || Date.now() - S.inicioForm < 3000) {
    mostrarError(errorEl, 'Algo salió raro. Espera un segundito e intenta de nuevo.');
    return null;
  }
  const textoBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Apartando...';
  try {
    // Revalidar que la mesa siga libre.
    S.reservasDelDia = await listar('reservas', { eq: { fecha: S.fecha }, orden: 'hora' });
    if (S.mesa && mesasOcupadas(S.reservasDelDia, S.hora).has(S.mesa.id)) {
      S.mesa = null;
      toast('Alguien te ganó esa mesa justo ahorita. Escoge otra.', { tipo: 'error' });
      ir(2);
      return null;
    }

    const datos = {
      folio: nuevoFolio(),
      fecha: S.fecha,
      hora: S.hora,
      personas: S.personas,
      mesa_id: S.mesa?.id ?? null,
      zona: S.mesa?.zona ?? S.zonaPref,
      nombre: $('#nombre').value.trim(),
      correo: $('#correo').value.trim().toLowerCase(),
      telefono: normalizarTelefono($('#telefono').value),
      ocasion: S.ocasion,
      corazon_roto: $('#corazon').checked,
      comentarios: $('#comentarios').value.trim() || null,
      extras: [...S.extras].map((id) => ({ id, cantidad: 1 })),
      estado: 'pendiente',
      source: fuente(),
      ...pago,
    };
    const r = await insertar('reservas', datos);
    S.reserva = r;

    // El CRM y el correo no deben tumbar la reserva si fallan.
    guardarCliente({ nombre: r.nombre, correo: r.correo, telefono: r.telefono }).catch(() => {});
    mandarCorreo('nueva', r, { lang: 'es' });
    track('reserva_enviada', { personas: r.personas, ocasion: r.ocasion, value: r.monto_deposito, currency: 'USD' });

    if (mostrar) await pintarConfirmacion(r);
    return r;
  } catch (e) {
    mostrarError(errorEl, 'No pudimos apartar tu mesa.');
    return null;
  } finally {
    btn.disabled = false;
    btn.textContent = textoBtn;
  }
}

/* ============================================================
   Confirmación
   ============================================================ */
async function pintarConfirmacion(r) {
  const mesa = mesaPorId(r.mesa_id);
  $('#p6-sub').textContent = `${fechaLarga(r.fecha)} a las ${hora(r.hora)}, ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}${
    mesa ? `, mesa ${mesa.numero}` : ''
  }. Folio ${r.folio}. ${r.estado === 'confirmada' ? 'Tu depósito quedó pagado.' : 'La cantina te confirma por correo o WhatsApp.'}${
    r.corazon_roto ? ' Y tranquilo, aquí no se llora: aquí se canta.' : ''
  }`;
  $('#boleto').innerHTML = await htmlBoleto(r);
  $('#calendario-link').href = linkCalendario({
    fecha: r.fecha,
    hora: r.hora,
    titulo: 'Sin Yolanda El Paso: ¡a cantar!',
    detalles: `Folio ${r.folio}. ${r.personas} personas. Tu noche: ${urlTuNoche(r.folio)}`,
    lugar: '340 Vin Rambla Dr, El Paso, TX',
  });
  $('#invitar').href = linkWhatsApp(
    '',
    `¡Ya aparté en Sin Yolanda El Paso! 🎤 ${fechaLarga(r.fecha)} a las ${hora(r.hora)}. Aquí no se llora, aquí se canta. Ve los detalles: ${urlTuNoche(r.folio)}`,
  );
  $('#ver-noche').href = urlTuNoche(r.folio);
  $('#guardar-boleto').onclick = () => descargarBoleto(r);
  ir(6);
  $('#paso-6').focus({ preventScroll: true });
}

/* ============================================================
   Tiempo real: si alguien más aparta, la disponibilidad se actualiza
   ============================================================ */
suscribir('reservas', ({ nueva }) => {
  if (S.fecha && nueva?.fecha === S.fecha && S.paso <= 2) cargarReservasDelDia();
});

/* ---------- Arranque ---------- */
pintarCalendario();
pintarPersonas();
ir(1);
if (S.fecha) cargarReservasDelDia();
