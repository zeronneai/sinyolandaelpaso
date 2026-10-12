// Pestañas extra del admin (Bloque F): Fotos, Lealtad, Reseñas, Clientes y Reportes.

import { CONFIG } from '../../config.js';
import { datos } from './store.js';
import { cambiar, crear } from './acciones.js';
import { $, esc, haceCuanto, fechaCorta, linkWhatsApp, toast } from '../ui.js';
import { normalizarTelefono } from '../datos.js';
import { htmlTarjeta, SELLOS_PREMIO } from '../lealtad.js';
import { nombreZona, mesaPorId } from '../disponibilidad.js';

/* ============================================================
   FOTOS (moderar el muro)
   ============================================================ */
const fotosVista = {
  id: 'fotos',
  titulo: 'Fotos',
  icono: 'sol',
  badge: () => datos.fotos.filter((f) => f.estado === 'pendiente').length || '',
  montar(el) {
    el.innerHTML = `<h2 class="panel__t">Por aprobar</h2><div class="fotos-grid" id="fotos-pend"></div>
      <h2 class="panel__t panel__t--sep">En la pantalla</h2><div class="fotos-grid fotos-grid--chica" id="fotos-ok"></div>`;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-foto]');
      if (!b) return;
      b.disabled = true;
      await cambiar('fotos', b.dataset.foto, { estado: b.dataset.estado });
    });
    this.actualizar();
  },
  actualizar() {
    if (!$('#fotos-pend')) return;
    const tarjeta = (f, botones) => `<figure class="foto-mod"><img src="${esc(f.url)}" alt="Foto de la mesa ${f.mesa ?? ''}" loading="lazy">
      <figcaption>Mesa ${f.mesa ?? '?'} · ${haceCuanto(f.created_at)}</figcaption>${botones}</figure>`;
    const pend = datos.fotos.filter((f) => f.estado === 'pendiente').sort((a, b) => a.created_at.localeCompare(b.created_at));
    $('#fotos-pend').innerHTML = pend
      .map((f) => tarjeta(f, `<div class="foto-mod__btns"><button type="button" class="btn btn--mostaza btn--chico" data-foto="${f.id}" data-estado="aprobada">Aprobar</button>
        <button type="button" class="btn btn--chico" data-foto="${f.id}" data-estado="rechazada">Rechazar</button></div>`))
      .join('') || '<p class="vacio vacio--oscuro">No hay fotos esperando.</p>';
    const ok = datos.fotos.filter((f) => f.estado === 'aprobada').sort((a, b) => b.created_at.localeCompare(a.created_at));
    $('#fotos-ok').innerHTML = ok
      .map((f) => tarjeta(f, `<div class="foto-mod__btns"><button type="button" class="btn-texto btn-texto--claro" data-foto="${f.id}" data-estado="rechazada">Quitar</button></div>`))
      .join('') || '<p class="vacio vacio--oscuro">Ninguna todavía.</p>';
  },
};

/* ============================================================
   LEALTAD (sellos)
   ============================================================ */
let lealtadQ = '';
let lealtadSel = null;
const lealtadVista = {
  id: 'lealtad',
  titulo: 'Lealtad',
  icono: 'corazon',
  montar(el) {
    el.innerHTML = `<div class="lealtad">
      <section class="panel">
        <h2 class="panel__t">Buscar cliente</h2>
        <input class="buscar" id="leal-q" type="search" placeholder="Teléfono o nombre" value="${esc(lealtadQ)}" aria-label="Buscar cliente">
        <ul class="leal-lista" id="leal-lista" role="list"></ul>
        <form class="leal-nuevo" id="leal-nuevo">
          <p>¿No está? Dale de alta:</p>
          <input name="nombre" placeholder="Nombre" required aria-label="Nombre">
          <input name="telefono" placeholder="WhatsApp" required inputmode="tel" aria-label="WhatsApp">
          <button class="btn btn--chico btn--mostaza">Crear tarjeta</button>
        </form>
      </section>
      <section class="panel" id="leal-detalle"></section>
    </div>`;
    $('#leal-q').addEventListener('input', (e) => {
      lealtadQ = e.target.value;
      this.actualizar();
    });
    $('#leal-lista').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cliente]');
      if (!b) return;
      lealtadSel = b.dataset.cliente;
      this.actualizar();
    });
    $('#leal-nuevo').addEventListener('submit', async (e) => {
      e.preventDefault();
      const c = await crear('clientes', { nombre: e.target.nombre.value.trim(), telefono: normalizarTelefono(e.target.telefono.value), correo: null, visitas: 0, sellos: 0, etiquetas: ['tarjeta'] });
      lealtadSel = c.id;
      e.target.reset();
      this.actualizar();
    });
    $('#leal-detalle').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sello]');
      if (!b) return;
      const c = datos.clientes.find((x) => x.id === lealtadSel);
      const accion = b.dataset.sello;
      const sellos = accion === 'dar' ? Math.min(SELLOS_PREMIO, (c.sellos || 0) + 1) : accion === 'quitar' ? Math.max(0, (c.sellos || 0) - 1) : 0;
      await cambiar('clientes', c.id, { sellos });
      if (accion === 'canjear') toast(`Cantarito de la casa para ${c.nombre.split(' ')[0]}. ¡Salud!`, { tipo: 'reserva', icono: 'cantarito' });
    });
    this.actualizar();
  },
  actualizar() {
    if (!$('#leal-lista')) return;
    const q = lealtadQ.trim().toLowerCase();
    const qd = q.replace(/\D/g, '');
    const lista = datos.clientes
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (qd && String(c.telefono || '').replace(/\D/g, '').includes(qd)))
      .sort((a, b) => (b.sellos || 0) - (a.sellos || 0))
      .slice(0, 12);
    $('#leal-lista').innerHTML = lista
      .map((c) => `<li><button type="button" class="leal-item${c.id === lealtadSel ? ' activo' : ''}" data-cliente="${c.id}">
        <span><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono || '')}</small></span>
        <span class="leal-item__sellos">${'●'.repeat(Math.min(5, c.sellos || 0))}${'○'.repeat(Math.max(0, 5 - (c.sellos || 0)))}</span></button></li>`)
      .join('') || '<li class="vacio vacio--oscuro">Nadie con esa búsqueda.</li>';
    const c = datos.clientes.find((x) => x.id === lealtadSel);
    $('#leal-detalle').innerHTML = c
      ? `<div class="leal-carta">${htmlTarjeta(c)}</div>
        <div class="botones">
          <button type="button" class="btn btn--mostaza btn--grande" data-sello="dar" ${c.sellos >= SELLOS_PREMIO ? 'disabled' : ''}>Dar sello</button>
          ${c.sellos >= SELLOS_PREMIO ? '<button type="button" class="btn btn--rosa btn--grande" data-sello="canjear">Canjear cantarito</button>' : ''}
          <button type="button" class="btn-texto btn-texto--claro" data-sello="quitar">Quitar uno</button>
        </div>`
      : '<p class="vacio vacio--oscuro">Escoge un cliente para ver su tarjeta.</p>';
  },
};

/* ============================================================
   RESEÑAS
   ============================================================ */
const resenasVista = {
  id: 'resenas',
  titulo: 'Reseñas',
  icono: 'destello',
  montar(el) {
    el.innerHTML = `<div class="stats" id="res-stats"></div><div class="resenas" id="resenas"></div>`;
    this.actualizar();
  },
  actualizar() {
    if (!$('#resenas')) return;
    const lista = [...datos.resenas].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const prom = lista.length ? lista.reduce((s, r) => s + r.estrellas, 0) / lista.length : 0;
    $('#res-stats').innerHTML = `
      <div class="stat"><p class="stat__n">${prom ? prom.toFixed(1) : '·'}</p><p class="stat__t">Promedio</p></div>
      <div class="stat"><p class="stat__n">${lista.filter((r) => r.estrellas === 5).length}</p><p class="stat__t">Mandados a Google (5★)</p></div>
      <div class="stat${lista.some((r) => r.estrellas <= 3) ? ' stat--alerta' : ''}"><p class="stat__n">${lista.filter((r) => r.estrellas <= 3).length}</p><p class="stat__t">Quejas privadas (3★ o menos)</p></div>`;
    $('#resenas').innerHTML = lista
      .map((r) => {
        const res = datos.reservas.find((x) => x.folio === r.folio);
        return `<article class="resena-item${r.estrellas <= 3 ? ' resena-item--privada' : ''}">
          <p class="resena-item__estrellas" aria-label="${r.estrellas} estrellas">${'★'.repeat(r.estrellas)}<span>${'★'.repeat(5 - r.estrellas)}</span></p>
          ${r.estrellas <= 3 ? '<span class="tag tag--dep-fallido">Privada: solo la ve el equipo</span>' : ''}
          <p class="resena-item__txt">${r.comentario ? `"${esc(r.comentario)}"` : '<i>Sin comentario</i>'}</p>
          <p class="resena-item__de">${res ? `${esc(res.nombre)} · ` : ''}${esc(r.folio || '')} · ${haceCuanto(r.created_at)}
          ${res && r.estrellas <= 3 ? ` · <a href="${linkWhatsApp(res.telefono, `Hola ${res.nombre.split(' ')[0]}, somos Sin Yolanda. Leímos tu comentario y queremos arreglarlo.`)}" target="_blank" rel="noopener">Escribirle por WhatsApp</a>` : ''}</p>
        </article>`;
      })
      .join('') || '<p class="vacio vacio--oscuro">Todavía no hay reseñas.</p>';
  },
};

/* ============================================================
   CLIENTES (CRM)
   ============================================================ */
let crmQ = '';
const clientesVista = {
  id: 'clientes',
  titulo: 'Clientes',
  icono: 'sombrero',
  montar(el) {
    el.innerHTML = `<input class="buscar" id="crm-q" type="search" placeholder="Buscar nombre, teléfono, etiqueta..." value="${esc(crmQ)}" aria-label="Buscar cliente">
      <p class="conteo" id="crm-conteo"></p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Nombre</th><th>Contacto</th><th>Visitas</th><th>Sellos</th><th>Última visita</th><th>Cumpleaños</th><th>Etiquetas</th><th>Notas</th></tr></thead>
      <tbody id="crm"></tbody></table></div>`;
    $('#crm-q').addEventListener('input', (e) => {
      crmQ = e.target.value;
      this.actualizar();
    });
    $('#crm').addEventListener('change', async (e) => {
      const i = e.target.closest('[data-crm]');
      if (!i) return;
      const campo = i.dataset.campo;
      const valor = campo === 'etiquetas' ? i.value.split(',').map((x) => x.trim()).filter(Boolean) : i.value;
      await cambiar('clientes', i.dataset.crm, { [campo]: valor });
      toast('Cliente actualizado', { tipo: 'info', duracion: 2000 });
    });
    this.actualizar();
  },
  actualizar() {
    if (!$('#crm')) return;
    if (document.activeElement?.closest?.('#crm')) return; // no pisar lo que se está escribiendo
    const q = crmQ.trim().toLowerCase();
    const lista = datos.clientes
      .filter((c) => !q || [c.nombre, c.telefono, c.correo, (c.etiquetas || []).join(' '), c.notas].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (b.visitas || 0) - (a.visitas || 0));
    $('#crm-conteo').textContent = `${lista.length} clientes`;
    const cumpleProximo = (c) => {
      if (!c.cumpleanos) return false;
      const hoy = new Date();
      const [, m, d] = c.cumpleanos.split('-').map(Number);
      let f = new Date(hoy.getFullYear(), m - 1, d);
      if (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = new Date(hoy.getFullYear() + 1, m - 1, d);
      return (f - hoy) / 86400000 <= 14;
    };
    $('#crm').innerHTML = lista
      .map((c) => `<tr>
        <td data-l="Nombre" class="c-nombre"><strong>${esc(c.nombre)}</strong></td>
        <td data-l="Contacto" class="c-ancho">${esc(c.telefono || '')}<br><small>${esc(c.correo || '')}</small></td>
        <td data-l="Visitas">${c.visitas || 0}</td><td data-l="Sellos">${c.sellos || 0}/${SELLOS_PREMIO}</td>
        <td data-l="Última visita">${c.ultima_visita ? fechaCorta(c.ultima_visita) : '·'}</td>
        <td data-l="Cumpleaños">${c.cumpleanos ? `${fechaCorta(c.cumpleanos).split(' ').slice(1).join(' ')}${cumpleProximo(c) ? ' 🎂' : ''}` : '·'}</td>
        <td data-l="Etiquetas" class="c-ancho"><input class="crm-input" data-crm="${c.id}" data-campo="etiquetas" value="${esc((c.etiquetas || []).join(', '))}" aria-label="Etiquetas de ${esc(c.nombre)}"></td>
        <td data-l="Notas" class="c-ancho"><input class="crm-input" data-crm="${c.id}" data-campo="notas" value="${esc(c.notas || '')}" aria-label="Notas de ${esc(c.nombre)}"></td>
      </tr>`)
      .join('');
  },
};

/* ============================================================
   REPORTES
   ============================================================ */
function barras(titulo, filas, { unidad = '' } = {}) {
  const max = Math.max(1, ...filas.map((f) => f[1]));
  return `<section class="panel reporte">
    <h2 class="panel__t">${esc(titulo)}</h2>
    ${filas.length
      ? `<ul class="barras" role="list">${filas
          .map(([etq, v, extra]) => `<li class="barra" title="${esc(etq)}: ${v}${unidad}${extra ? ` (${esc(extra)})` : ''}">
            <span class="barra__etq">${esc(etq)}</span>
            <span class="barra__pista"><span class="barra__relleno" style="width:${(v / max) * 100}%"></span></span>
            <span class="barra__v">${v}${unidad}${extra ? ` <small>${esc(extra)}</small>` : ''}</span></li>`)
          .join('')}</ul>`
      : '<p class="vacio vacio--oscuro">Sin datos todavía.</p>'}
  </section>`;
}
const contar = (lista, clave, peso = () => 1) => {
  const m = new Map();
  for (const x of lista) {
    const k = clave(x);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + peso(x));
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const reportesVista = {
  id: 'reportes',
  titulo: 'Reportes',
  icono: 'cantarito',
  montar(el) {
    el.innerHTML = '<div class="reportes" id="reportes"></div>';
    this.actualizar();
  },
  actualizar() {
    if (!$('#reportes')) return;
    const res = datos.reservas.filter((r) => r.estado !== 'cancelada');
    const porDia = contar(res, (r) => r.fecha).sort((a, b) => a[0].localeCompare(b[0]));
    const personasDia = new Map(contar(res, (r) => r.fecha, (r) => r.personas));
    const ocas = (id) => CONFIG.ocasiones.find((o) => o.id === id)?.es ?? id;
    const canciones = contar([...datos.turnos_micro, ...datos.dedicatorias], (t) => t.cancion).slice(0, 8);
    const atendidos = datos.llamados.filter((l) => l.estado === 'atendido' && l.atendido_at);
    const tiempoPorTipo = ['mesero', 'cuenta', 'ayuda'].map((tipo) => {
      const xs = atendidos.filter((l) => l.tipo === tipo);
      const prom = xs.length ? xs.reduce((s, l) => s + (new Date(l.atendido_at) - new Date(l.created_at)) / 60000, 0) / xs.length : 0;
      return [{ mesero: 'Mesero', cuenta: 'Cuenta', ayuda: 'Ayuda' }[tipo], Math.round(prom * 10) / 10, `${xs.length} atendidos`];
    }).filter((x) => x[1] > 0 || x[2] !== '0 atendidos');

    const totalPersonas = res.reduce((s, r) => s + r.personas, 0);
    const deposito = res.filter((r) => r.deposito_estado === 'pagado').reduce((s, r) => s + Number(r.monto_deposito || 0), 0);
    $('#reportes').innerHTML = `
      <div class="stats">
        <div class="stat"><p class="stat__n">${res.length}</p><p class="stat__t">Reservas activas</p></div>
        <div class="stat"><p class="stat__n">${totalPersonas}</p><p class="stat__t">Personas</p></div>
        <div class="stat"><p class="stat__n">$${deposito}</p><p class="stat__t">Depósitos pagados</p></div>
        <div class="stat"><p class="stat__n">${datos.turnos_micro.length}</p><p class="stat__t">Turnos al micro</p></div>
      </div>
      <div class="reportes-grid">
        ${barras('Reservas por día', porDia.map(([f, n]) => [fechaCorta(f), n, `${personasDia.get(f)} personas`]))}
        ${barras('Por fuente (utm_source)', contar(res, (r) => r.source || 'directo'))}
        ${barras('Por ocasión', contar(res, (r) => ocas(r.ocasion)))}
        ${barras('Por zona', contar(res, (r) => (r.zona ? nombreZona(r.zona) : mesaPorId(r.mesa_id) ? nombreZona(mesaPorId(r.mesa_id).zona) : 'Sin zona')))}
        ${barras('Canciones más pedidas', canciones)}
        ${barras('Llamados: minutos promedio en atender', tiempoPorTipo, { unidad: ' min' })}
      </div>`;
  },
};

export const VISTAS_EXTRA = [fotosVista, lealtadVista, resenasVista, clientesVista, reportesVista];
