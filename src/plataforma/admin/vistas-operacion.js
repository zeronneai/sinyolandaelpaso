// Vistas esenciales del admin: Hoy, Mapa, Reservas, Micrófono y Llamados.

import { CONFIG } from '../../config.js';
import { datos } from './store.js';
import { cambiar, crear, cambiarEstadoReserva, registrarWalkIn, ESTADOS_RESERVA, BOTONES_ESTADO } from './acciones.js';
import { $, $$, esc, hora, fechaLarga, fechaCorta, minutosDesde, haceCuanto, linkWhatsApp, sumarDias, toast } from '../ui.js';
import { MESAS, mesaPorId, nombreZona, reservaActiva, minutosServicio } from '../disponibilidad.js';
import { pintarMapa } from '../mapa.js';
import { dinero } from '../pagos.js';
import { hoyEnElPaso, ahoraEnElPaso } from '../../js/horario.js';

const ocasionTexto = (id) => CONFIG.ocasiones.find((o) => o.id === id)?.es ?? (id === 'otra' ? 'Otra' : id || '');
const extraTexto = (x) => CONFIG.extras.find((e) => e.id === x.id)?.nombre ?? x.id;
const reservasDe = (fecha) =>
  datos.reservas.filter((r) => r.fecha === fecha).sort((a, b) => minutosServicio(a.hora) - minutosServicio(b.hora));

/** Mesas ocupadas ahorita (gente que llegó o está sentada hoy). */
function ocupacionHoy() {
  const hoy = hoyEnElPaso();
  const mapa = new Map();
  for (const r of datos.reservas) {
    if (r.fecha === hoy && r.mesa_id && (r.estado === 'llego' || r.estado === 'sentada')) mapa.set(r.mesa_id, r);
  }
  return mapa;
}
function proximasHoy() {
  const hoy = hoyEnElPaso();
  const { minutos } = ahoraEnElPaso();
  const mapa = new Map();
  for (const r of reservasDe(hoy)) {
    if (!r.mesa_id || !['pendiente', 'confirmada'].includes(r.estado)) continue;
    if (minutosServicio(r.hora) >= minutos - 30 && !mapa.has(r.mesa_id)) mapa.set(r.mesa_id, r);
  }
  return mapa;
}
const llamadosPendientes = () => datos.llamados.filter((l) => l.estado === 'pendiente');

function chipsEstado(r) {
  return `<div class="estados" role="group" aria-label="Estado de ${esc(r.nombre)}">
    ${BOTONES_ESTADO.map(
      ([e, t]) => `<button type="button" class="estado-btn estado-btn--${e}${r.estado === e ? ' activo' : ''}" data-reserva="${r.id}" data-estado="${e}" aria-pressed="${r.estado === e}">${t}</button>`,
    ).join('')}
  </div>`;
}

function tarjetaReserva(r) {
  const mesa = mesaPorId(r.mesa_id);
  const extras = (r.extras || []).map(extraTexto);
  return `<article class="res res--${r.estado}">
    <div class="res__hora">${hora(r.hora)}</div>
    <div class="res__info">
      <p class="res__nombre">${esc(r.nombre)} ${r.corazon_roto ? '<span title="Viene con el corazón roto">💔</span>' : ''}</p>
      <p class="res__meta">
        <span>${r.personas} p</span>
        <span>${mesa ? `Mesa ${mesa.numero} · ${esc(nombreZona(mesa.zona))}` : r.zona ? esc(nombreZona(r.zona)) : 'Sin mesa'}</span>
        <span>${esc(ocasionTexto(r.ocasion))}</span>
        ${r.source === 'walk-in' ? '<span class="tag">Walk-in</span>' : ''}
        ${r.deposito_estado !== 'no_aplica' ? `<span class="tag tag--dep-${r.deposito_estado}">Depósito ${r.deposito_estado} ${dinero(Number(r.monto_deposito))}</span>` : ''}
      </p>
      ${extras.length ? `<p class="res__extras">✦ ${extras.map(esc).join(' · ')}</p>` : ''}
      ${r.comentarios ? `<p class="res__coment">"${esc(r.comentarios)}"</p>` : ''}
      ${r.llegada_at && ['llego', 'sentada'].includes(r.estado) ? `<p class="res__desde">Llegó ${haceCuanto(r.llegada_at)}</p>` : ''}
    </div>
    <div class="res__acciones">
      <span class="estado-tag estado-tag--${r.estado}">${ESTADOS_RESERVA[r.estado]}</span>
      ${r.estado === 'cancelada' ? '' : chipsEstado(r)}
    </div>
  </article>`;
}

/** Delegación de clics para los botones de estado (sirve en varias vistas). */
function escucharEstados(el) {
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-estado][data-reserva]');
    if (!b) return;
    const r = datos.reservas.find((x) => x.id === b.dataset.reserva);
    if (!r || r.estado === b.dataset.estado) return;
    b.disabled = true;
    await cambiarEstadoReserva(r, b.dataset.estado).catch(() => toast('No se pudo cambiar el estado', { tipo: 'error' }));
  });
}

/* ============================================================
   HOY
   ============================================================ */
let fechaHoy = null;
const hoyVista = {
  id: 'hoy',
  titulo: 'Hoy',
  icono: 'sol',
  montar(el) {
    fechaHoy ||= hoyEnElPaso();
    el.innerHTML = `
      <div class="fila-fecha">
        <button type="button" class="btn-icono" data-dia="-1" aria-label="Día anterior">‹</button>
        <h2 class="fila-fecha__t" id="hoy-fecha"></h2>
        <button type="button" class="btn-icono" data-dia="1" aria-label="Día siguiente">›</button>
        <button type="button" class="btn btn--chico" data-dia="0">Hoy</button>
      </div>
      <div class="stats" id="hoy-stats"></div>
      <div class="linea" id="hoy-linea"></div>`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dia]');
      if (!b) return;
      fechaHoy = b.dataset.dia === '0' ? hoyEnElPaso() : sumarDias(fechaHoy, Number(b.dataset.dia));
      this.actualizar();
    });
    escucharEstados(el);
    this.actualizar();
  },
  actualizar() {
    if (!$('#hoy-linea')) return;
    const esHoy = fechaHoy === hoyEnElPaso();
    $('#hoy-fecha').textContent = `${esHoy ? 'Hoy, ' : ''}${fechaLarga(fechaHoy)}`;
    const lista = reservasDe(fechaHoy);
    const activas = lista.filter(reservaActiva);
    const ocupadas = ocupacionHoy();
    const fila = datos.turnos_micro.filter((t) => t.estado === 'en_fila').length;
    const llamados = llamadosPendientes().length;
    $('#hoy-stats').innerHTML = [
      ['Reservas', activas.length, 'corazon', ''],
      ['Personas esperadas', activas.reduce((s, r) => s + r.personas, 0), 'sombrero', ''],
      ['Mesas libres', esHoy ? MESAS.length - ocupadas.size : '·', 'cantarito', esHoy ? `de ${MESAS.length}` : 'solo hoy'],
      ['Fila del micro', fila, 'micro', ''],
      ['Llamados pendientes', llamados, 'ojo', llamados ? 'alerta' : ''],
    ]
      .map(
        ([t, n, i, extra]) => `<div class="stat${extra === 'alerta' ? ' stat--alerta' : ''}">
        <svg aria-hidden="true"><use href="#i-${i}"/></svg><p class="stat__n">${n}</p><p class="stat__t">${t}${extra && extra !== 'alerta' ? ` <small>${extra}</small>` : ''}</p></div>`,
      )
      .join('');

    if (!lista.length) {
      $('#hoy-linea').innerHTML = '<p class="vacio vacio--oscuro">No hay reservas para este día. Tranquilo, ya caerán.</p>';
      return;
    }
    const grupos = new Map();
    for (const r of lista.filter((x) => x.estado !== 'cancelada')) {
      const h = `${r.hora.slice(0, 2)}:00`;
      if (!grupos.has(h)) grupos.set(h, []);
      grupos.get(h).push(r);
    }
    const canceladas = lista.filter((x) => x.estado === 'cancelada');
    $('#hoy-linea').innerHTML =
      [...grupos.entries()]
        .map(
          ([h, rs]) => `<section class="linea__hora">
          <h3 class="linea__t"><span>${hora(h)}</span> <small>${rs.length} ${rs.length === 1 ? 'reserva' : 'reservas'} · ${rs.reduce((s, r) => s + r.personas, 0)} p</small></h3>
          ${rs.map(tarjetaReserva).join('')}
        </section>`,
        )
        .join('') +
      (canceladas.length
        ? `<details class="linea__canceladas"><summary>${canceladas.length} canceladas</summary>${canceladas.map(tarjetaReserva).join('')}</details>`
        : '');
  },
};

/* ============================================================
   MAPA + walk-ins + lista de espera
   ============================================================ */
const mapaVista = {
  id: 'mapa',
  titulo: 'Mapa',
  icono: 'cantarito',
  montar(el) {
    el.innerHTML = `
      <div class="mapa-admin">
        <div class="panel">
          <ul class="leyenda leyenda--oscura" role="list">
            <li><i class="l-libre"></i> Libre</li>
            <li><i class="l-reservada"></i> Reservada hoy</li>
            <li><i class="l-sentada"></i> Ocupada</li>
            <li><i class="l-llamando"></i> Está llamando</li>
          </ul>
          <div id="mapa-admin"></div>
        </div>
        <div class="panel espera">
          <h2 class="panel__t">Lista de espera</h2>
          <form class="espera__form" id="espera-form">
            <input name="nombre" placeholder="Nombre" required aria-label="Nombre">
            <input name="telefono" placeholder="WhatsApp" inputmode="tel" aria-label="WhatsApp">
            <input name="personas" type="number" min="1" max="30" value="2" aria-label="Personas">
            <button class="btn btn--mostaza btn--chico">Anotar</button>
          </form>
          <ol class="espera__lista" id="espera-lista"></ol>
        </div>
      </div>`;
    $('#espera-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await crear('lista_espera', { nombre: f.nombre.value.trim(), telefono: f.telefono.value.trim(), personas: Number(f.personas.value) || 2, estado: 'esperando' });
      f.reset();
      f.personas.value = 2;
    });
    $('#espera-lista').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-espera]');
      if (!b) return;
      const item = datos.lista_espera.find((x) => x.id === b.dataset.espera);
      if (b.dataset.accion === 'avisar') {
        window.open(linkWhatsApp(item.telefono, `¡${item.nombre.split(' ')[0]}, ya está tu mesa, compa! Te esperamos en Sin Yolanda. 🎤`), '_blank', 'noopener');
        await cambiar('lista_espera', item.id, { estado: 'avisado' });
      } else await cambiar('lista_espera', item.id, { estado: b.dataset.accion });
    });
    this.actualizar();
    this.reloj = setInterval(() => this.pintarEspera(), 30000);
  },
  desmontar() {
    clearInterval(this.reloj);
  },
  actualizar() {
    if (!$('#mapa-admin')) return;
    const ocupadas = ocupacionHoy();
    const proximas = proximasHoy();
    const llamando = new Set(llamadosPendientes().map((l) => Number(l.mesa)));
    pintarMapa($('#mapa-admin'), {
      clase: (m) => `${ocupadas.has(m.id) ? 'sentada' : proximas.has(m.id) ? 'reservada' : 'libre'}${llamando.has(m.id) ? ' mesa--llamando' : ''}`,
      etiqueta: (m) => `Mesa ${m.numero}${ocupadas.has(m.id) ? `, ocupada por ${ocupadas.get(m.id).nombre}` : proximas.has(m.id) ? `, reservada ${hora(proximas.get(m.id).hora)}` : ', libre'}`,
      extra: (m) => {
        const r = ocupadas.get(m.id) || proximas.get(m.id);
        return r ? `<text class="mesa__quien" x="${m.x}" y="${m.y + 48}">${esc(r.nombre.split(' ')[0])}${ocupadas.has(m.id) ? '' : ` ${hora(r.hora)}`}</text>` : '';
      },
      onElegir: (m) => abrirMesa(m),
    });
    this.pintarEspera();
  },
  pintarEspera() {
    const lista = datos.lista_espera
      .filter((x) => x.estado === 'esperando' || x.estado === 'avisado')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    $('#espera-lista').innerHTML = lista.length
      ? lista
          .map(
            (x) => `<li class="espera__item${x.estado === 'avisado' ? ' espera__item--avisado' : ''}">
          <div><strong>${esc(x.nombre)}</strong> · ${x.personas} p<br><small>Esperando ${haceCuanto(x.created_at).replace('hace ', '')}${x.estado === 'avisado' ? ' · ya se le avisó' : ''}</small></div>
          <div class="espera__btns">
            ${x.telefono ? `<button type="button" class="btn btn--chico btn--mostaza" data-espera="${x.id}" data-accion="avisar">Avisar por WhatsApp</button>` : ''}
            <button type="button" class="btn btn--chico" data-espera="${x.id}" data-accion="sentado">Sentar</button>
            <button type="button" class="btn-texto btn-texto--claro" data-espera="${x.id}" data-accion="se_fue">Se fue</button>
          </div></li>`,
          )
          .join('')
      : '<li class="vacio vacio--oscuro">Nadie esperando. ¡Qué bien!</li>';
  },
};

function abrirMesa(m) {
  const ocupada = ocupacionHoy().get(m.id);
  const proxima = proximasHoy().get(m.id);
  const llamados = llamadosPendientes().filter((l) => Number(l.mesa) === m.id);
  const hoja = $('#hoja');
  const r = ocupada || proxima;
  $('#hoja-contenido').innerHTML = `
    <div class="hoja__caja">
      <h2 class="tarjeta__titulo">Mesa ${m.numero} <small>${esc(nombreZona(m.zona))} · hasta ${m.capacidad} p</small></h2>
      ${llamados.map((l) => `<p class="aviso-llamado">Está pidiendo: ${{ cuenta: 'la cuenta', mesero: 'mesero', ayuda: 'ayuda' }[l.tipo]} (${haceCuanto(l.created_at)})</p>`).join('')}
      ${
        r
          ? `${tarjetaReserva(r)}${ocupada ? `<p class="ayuda">Aquí desde ${haceCuanto(ocupada.llegada_at)}.</p>` : ''}`
          : `<p>Libre ahorita. ¿Llegó alguien sin reserva?</p>
          <form class="walkin" id="walkin">
            <label class="campo"><span>Nombre</span><input name="nombre" placeholder="Walk-in"></label>
            <label class="campo"><span>Personas</span><input name="personas" type="number" min="1" max="${m.capacidad}" value="${Math.min(2, m.capacidad)}"></label>
            <button class="btn btn--mostaza">Sentar walk-in</button>
          </form>`
      }
      <div class="botones"><button type="button" class="btn" id="hoja-cerrar">Cerrar</button></div>
    </div>`;
  escucharEstadosUnaVez($('#hoja-contenido'));
  $('#hoja-cerrar').onclick = () => hoja.close();
  $('#walkin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await registrarWalkIn({ nombre: e.target.nombre.value.trim(), personas: Number(e.target.personas.value) || 2, mesa_id: m.id });
    hoja.close();
  });
  hoja.showModal();
}
function escucharEstadosUnaVez(el) {
  el.onclick = async (e) => {
    const b = e.target.closest('[data-estado][data-reserva]');
    if (!b) return;
    const r = datos.reservas.find((x) => x.id === b.dataset.reserva);
    await cambiarEstadoReserva(r, b.dataset.estado);
    $('#hoja').close();
  };
}

/* ============================================================
   RESERVAS (tabla con búsqueda y filtros)
   ============================================================ */
const filtros = { q: '', fecha: '', ocasion: '', estado: '' };
let destacado = null; // folio que llega por /admin/?reserva=FOLIO
export function destacarReserva(folio) {
  destacado = folio;
  Object.assign(filtros, { q: '', fecha: '', ocasion: '', estado: '' });
}
const reservasVista = {
  id: 'reservas',
  titulo: 'Reservas',
  icono: 'corazon',
  montar(el) {
    el.innerHTML = `
      <form class="filtros" id="filtros" role="search">
        <input type="search" name="q" placeholder="Buscar nombre, folio, teléfono..." aria-label="Buscar" value="${esc(filtros.q)}">
        <input type="date" name="fecha" aria-label="Fecha" value="${filtros.fecha}">
        <select name="ocasion" aria-label="Ocasión"><option value="">Todas las ocasiones</option>${CONFIG.ocasiones.map((o) => `<option value="${o.id}">${esc(o.es)}</option>`).join('')}</select>
        <select name="estado" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(ESTADOS_RESERVA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      </form>
      <div id="res-destacada"></div>
      <p class="conteo" id="conteo"></p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr>
        <th>Fecha</th><th>Hora</th><th>Folio</th><th>Nombre</th><th>P</th><th>Mesa</th><th>Ocasión</th><th>Extras</th><th>Depósito</th><th>Fuente</th><th>Estado</th>
      </tr></thead><tbody id="tabla-res"></tbody></table></div>`;
    const f = $('#filtros');
    f.ocasion.value = filtros.ocasion;
    f.estado.value = filtros.estado;
    f.addEventListener('input', () => {
      Object.assign(filtros, { q: f.q.value, fecha: f.fecha.value, ocasion: f.ocasion.value, estado: f.estado.value });
      this.actualizar();
    });
    f.addEventListener('submit', (e) => e.preventDefault());
    escucharEstados($('#res-destacada'));
    $('#tabla-res').addEventListener('change', async (e) => {
      const s = e.target.closest('select[data-reserva]');
      if (!s) return;
      const r = datos.reservas.find((x) => x.id === s.dataset.reserva);
      await cambiarEstadoReserva(r, s.value);
    });
    this.actualizar();
  },
  actualizar() {
    if (!$('#tabla-res')) return;
    const q = filtros.q.trim().toLowerCase();
    const lista = datos.reservas
      .filter((r) => !filtros.fecha || r.fecha === filtros.fecha)
      .filter((r) => !filtros.ocasion || r.ocasion === filtros.ocasion)
      .filter((r) => !filtros.estado || r.estado === filtros.estado)
      .filter((r) => !q || [r.nombre, r.folio, r.telefono, r.correo].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || minutosServicio(a.hora) - minutosServicio(b.hora));
    if (destacado) {
      const r = datos.reservas.find((x) => x.folio === destacado);
      $('#res-destacada').innerHTML = `<div class="destacada"><div class="destacada__cab"><p>Reserva ${esc(destacado)}</p>
        <button type="button" class="btn-texto btn-texto--claro" id="quitar-destacada">Cerrar</button></div>
        ${r ? tarjetaReserva(r) : '<p class="vacio vacio--oscuro">No encontramos ese folio.</p>'}</div>`;
      $('#quitar-destacada').onclick = () => {
        destacado = null;
        history.replaceState(null, '', location.pathname + location.hash);
        this.actualizar();
      };
    } else $('#res-destacada').innerHTML = '';
    $('#conteo').textContent = `${lista.length} ${lista.length === 1 ? 'reserva' : 'reservas'} · ${lista.reduce((s, r) => s + r.personas, 0)} personas`;
    $('#tabla-res').innerHTML = lista
      .map(
        (r) => `<tr class="fila--${r.estado}${r.folio === destacado ? ' fila--destacada' : ''}">
        <td>${fechaCorta(r.fecha)}</td><td>${hora(r.hora)}</td><td class="mono">${esc(r.folio)}</td>
        <td><strong>${esc(r.nombre)}</strong>${r.corazon_roto ? ' 💔' : ''}<br><small>${esc(r.telefono)}</small></td>
        <td>${r.personas}</td><td>${r.mesa_id ?? '·'}</td><td>${esc(ocasionTexto(r.ocasion))}</td>
        <td>${(r.extras || []).map(extraTexto).map(esc).join(', ') || '·'}</td>
        <td>${r.deposito_estado === 'no_aplica' ? '·' : `<span class="tag tag--dep-${r.deposito_estado}">${r.deposito_estado}</span> ${dinero(Number(r.monto_deposito))}`}</td>
        <td>${esc(r.source || '')}</td>
        <td><select data-reserva="${r.id}" aria-label="Estado de ${esc(r.nombre)}">${Object.entries(ESTADOS_RESERVA)
          .map(([k, v]) => `<option value="${k}" ${k === r.estado ? 'selected' : ''}>${v}</option>`)
          .join('')}</select></td></tr>`,
      )
      .join('') || '<tr><td colspan="11" class="vacio vacio--oscuro">Nada con esos filtros.</td></tr>';
  },
};

/* ============================================================
   EL MICRÓFONO: fila para cantar y dedicatorias
   ============================================================ */
const microVista = {
  id: 'micro',
  titulo: 'El micrófono',
  icono: 'micro',
  badge: () => datos.turnos_micro.filter((t) => t.estado === 'en_fila').length || '',
  montar(el) {
    el.innerHTML = `<div class="dos-col">
      <section class="panel"><h2 class="panel__t">La fila para cantar</h2><div id="fila-micro"></div></section>
      <section class="panel"><h2 class="panel__t">Dedicatorias</h2><div id="fila-dedic"></div></section>
    </div>`;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-accion]');
      if (!b) return;
      b.disabled = true;
      const { accion, id } = b.dataset;
      if (accion === 'siguiente') await siguienteTurno();
      if (accion === 'cantando') await ponerCantando(id);
      if (accion === 'saltar-turno') await cambiar('turnos_micro', id, { estado: 'saltado' });
      if (accion === 'cantada') await cambiar('dedicatorias', id, { estado: 'cantada' });
      if (accion === 'saltar-dedic') await cambiar('dedicatorias', id, { estado: 'saltada' });
    });
    this.actualizar();
  },
  actualizar() {
    if (!$('#fila-micro')) return;
    const cantando = datos.turnos_micro.find((t) => t.estado === 'cantando');
    const fila = datos.turnos_micro.filter((t) => t.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at));
    $('#fila-micro').innerHTML = `
      <div class="cantando">
        <p class="cantando__eti">Cantando ahora</p>
        ${cantando ? `<p class="cantando__nombre">${esc(cantando.nombre)} <small>Mesa ${cantando.mesa}</small></p><p class="cantando__cancion">${esc(cantando.cancion)}${cantando.artista ? ` · ${esc(cantando.artista)}` : ''}</p>` : '<p class="cantando__nombre">Nadie. ¡El micro está solito!</p>'}
        <button type="button" class="btn btn--mostaza" data-accion="siguiente" ${!fila.length && !cantando ? 'disabled' : ''}>Siguiente ▸</button>
      </div>
      <ol class="cola">${fila
        .map(
          (t, i) => `<li class="cola__item"><span class="cola__n">${i + 1}</span>
          <div><strong>${esc(t.nombre)}</strong> · Mesa ${t.mesa}<br><span>${esc(t.cancion)}${t.artista ? ` · ${esc(t.artista)}` : ''}</span> <small>${haceCuanto(t.created_at)}</small></div>
          <div class="cola__btns"><button type="button" class="btn btn--chico" data-accion="cantando" data-id="${t.id}">Cantando</button>
          <button type="button" class="btn-texto btn-texto--claro" data-accion="saltar-turno" data-id="${t.id}">Saltar</button></div></li>`,
        )
        .join('') || '<li class="vacio vacio--oscuro">La fila está vacía.</li>'}</ol>`;

    const dedic = datos.dedicatorias.filter((d) => d.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at));
    $('#fila-dedic').innerHTML = `<ol class="cola">${dedic
      .map(
        (d, i) => `<li class="cola__item cola__item--dedic"><span class="cola__n">${i + 1}</span>
        <div><strong>"${esc(d.cancion)}"</strong> para <strong>${esc(d.para)}</strong><br>
        ${d.mensaje ? `<q>${esc(d.mensaje)}</q><br>` : ''}<small>${d.anonimo ? 'Anónimo' : `Mesa ${d.mesa}`} · ${haceCuanto(d.created_at)}</small></div>
        <div class="cola__btns"><button type="button" class="btn btn--chico btn--rosa" data-accion="cantada" data-id="${d.id}">Ya se cantó</button>
        <button type="button" class="btn-texto btn-texto--claro" data-accion="saltar-dedic" data-id="${d.id}">Saltar</button></div></li>`,
      )
      .join('') || '<li class="vacio vacio--oscuro">Sin dedicatorias por ahora.</li>'}</ol>`;
  },
};

async function siguienteTurno() {
  const cantando = datos.turnos_micro.find((t) => t.estado === 'cantando');
  if (cantando) await cambiar('turnos_micro', cantando.id, { estado: 'cantado' });
  const sig = datos.turnos_micro.filter((t) => t.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  if (sig) await cambiar('turnos_micro', sig.id, { estado: 'cantando' });
}
async function ponerCantando(id) {
  for (const t of datos.turnos_micro.filter((x) => x.estado === 'cantando')) await cambiar('turnos_micro', t.id, { estado: 'cantado' });
  await cambiar('turnos_micro', id, { estado: 'cantando' });
}

/* ============================================================
   LLAMADOS DE MESA
   ============================================================ */
const llamadosVista = {
  id: 'llamados',
  titulo: 'Llamados',
  icono: 'ojo',
  badgeAlerta: true,
  badge: () => llamadosPendientes().length || '',
  montar(el) {
    el.innerHTML = `<div class="llamados" id="llamados"></div><h2 class="panel__t panel__t--sep">Atendidos hace poco</h2><ul class="atendidos" id="atendidos"></ul>`;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-atender]');
      if (!b) return;
      b.disabled = true;
      await cambiar('llamados', b.dataset.atender, { estado: 'atendido', atendido_at: new Date().toISOString() });
    });
    this.actualizar();
    this.reloj = setInterval(() => this.actualizar(), 5000);
  },
  desmontar() {
    clearInterval(this.reloj);
  },
  actualizar() {
    if (!$('#llamados')) return;
    const TXT = { cuenta: 'pide la cuenta', mesero: 'llama al mesero', ayuda: 'necesita ayuda' };
    const pend = llamadosPendientes().sort((a, b) => a.created_at.localeCompare(b.created_at));
    $('#llamados').innerHTML = pend.length
      ? pend
          .map((l) => {
            const min = minutosDesde(l.created_at);
            return `<article class="llamado llamado--${l.tipo}${min >= 5 ? ' llamado--tarde' : ''}">
          <p class="llamado__mesa">Mesa ${l.mesa}</p>
          <p class="llamado__que">${TXT[l.tipo]}</p>
          <p class="llamado__tiempo">${min < 1 ? 'ahorita' : `${min} min esperando`}</p>
          <button type="button" class="btn btn--mostaza btn--grande" data-atender="${l.id}">Atendido</button>
        </article>`;
          })
          .join('')
      : '<p class="vacio vacio--oscuro">Ninguna mesa está llamando. Todo bajo control.</p>';
    const at = datos.llamados
      .filter((l) => l.estado === 'atendido' && l.atendido_at)
      .sort((a, b) => b.atendido_at.localeCompare(a.atendido_at))
      .slice(0, 8);
    $('#atendidos').innerHTML = at
      .map((l) => `<li>Mesa ${l.mesa} · ${TXT[l.tipo]} · atendido en ${Math.max(1, Math.round((new Date(l.atendido_at) - new Date(l.created_at)) / 60000))} min</li>`)
      .join('') || '<li class="vacio vacio--oscuro">Nada todavía.</li>';
  },
};

export const VISTAS_OPERACION = [hoyVista, mapaVista, reservasVista, microVista, llamadosVista];
