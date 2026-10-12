// Capa de datos de la plataforma, con dos motores intercambiables:
//
//  - supabase: Postgres + Realtime (postgres_changes) + canal broadcast.
//    Funciona entre computadoras y celulares distintos.
//  - local: localStorage + BroadcastChannel. Se usa cuando no hay variables
//    de Supabase. Sirve para probar en varias pestañas del MISMO navegador.
//
// Todas las páginas usan solo esta API, así que da igual qué motor esté activo.

import { createClient } from '@supabase/supabase-js';
import { ENV } from './entorno.js';
import * as SEED from './seed.js';
import { hoyEnElPaso } from '../js/horario.js';

export const TABLAS = [
  'mesas', 'reservas', 'lista_espera', 'dedicatorias', 'turnos_micro',
  'llamados', 'fotos', 'clientes', 'resenas', 'eventos_pantalla',
];

export const modo = ENV.haySupabase ? 'supabase' : 'local';

export const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/* ============================================================
   Motor SUPABASE
   ============================================================ */
function motorSupabase() {
  const sb = createClient(ENV.supabaseUrl, ENV.supabaseKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });

  const manejadores = new Map(); // evento -> Set(cb)
  let canal = null;
  let listo = null;
  const canalBroadcast = () => {
    if (canal) return listo;
    canal = sb.channel('sy-broadcast', { config: { broadcast: { self: true } } });
    canal.on('broadcast', { event: '*' }, ({ event, payload }) => {
      manejadores.get(event)?.forEach((cb) => cb(payload));
    });
    listo = new Promise((resolve) => {
      canal.subscribe((estado) => { if (estado === 'SUBSCRIBED') resolve(); });
    });
    return listo;
  };

  const falla = (error) => { if (error) throw new Error(error.message); };

  return {
    cliente: sb,
    async listar(tabla, { eq = {}, desde, hasta, campoFecha = 'fecha', orden = 'created_at', asc = true, limite } = {}) {
      let q = sb.from(tabla).select('*');
      for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
      if (desde) q = q.gte(campoFecha, desde);
      if (hasta) q = q.lte(campoFecha, hasta);
      if (orden) q = q.order(orden, { ascending: asc });
      if (limite) q = q.limit(limite);
      const { data, error } = await q;
      falla(error);
      return data;
    },
    async insertar(tabla, fila) {
      const { data, error } = await sb.from(tabla).insert(fila).select().single();
      falla(error);
      return data;
    },
    async actualizar(tabla, id, cambios) {
      const { data, error } = await sb.from(tabla).update(cambios).eq('id', id).select().single();
      falla(error);
      return data;
    },
    suscribir(tablas, cb) {
      const ch = sb.channel(`db-${uuid()}`);
      for (const tabla of tablas) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, (p) =>
          cb({ tabla, tipo: p.eventType, nueva: p.new, vieja: p.old }),
        );
      }
      ch.subscribe();
      return () => sb.removeChannel(ch);
    },
    async enviar(evento, payload) {
      await canalBroadcast();
      await canal.send({ type: 'broadcast', event: evento, payload });
    },
    escuchar(evento, cb) {
      if (!manejadores.has(evento)) manejadores.set(evento, new Set());
      manejadores.get(evento).add(cb);
      canalBroadcast();
      return () => manejadores.get(evento).delete(cb);
    },
    async subirFoto(blob) {
      const nombre = `${new Date().toISOString().slice(0, 10)}/${uuid()}.jpg`;
      const { error } = await sb.storage.from('fotos').upload(nombre, blob, { contentType: 'image/jpeg' });
      falla(error);
      return sb.storage.from('fotos').getPublicUrl(nombre).data.publicUrl;
    },
    async reiniciar() {
      const { error } = await sb.rpc('reiniciar_demo');
      falla(error);
    },
  };
}

/* ============================================================
   Motor LOCAL (localStorage + BroadcastChannel)
   ============================================================ */
const CLAVE = 'sy-demo-db-v1';

function fechaMas(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}
function diaAbierto(hoy, n) {
  let cuenta = 0;
  for (let i = 1; i <= 21; i++) {
    const f = fechaMas(hoy, i);
    const dow = new Date(`${f}T12:00:00Z`).getUTCDay();
    if (dow !== 1 && dow !== 2 && ++cuenta === n) return f;
  }
  return fechaMas(hoy, n);
}
const haceISO = (min) => new Date(Date.now() - min * 60000).toISOString();
const limpiar = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));

export function generarSeedLocal() {
  const hoy = hoyEnElPaso();
  const dow = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const base = (o, extra = {}) => ({ id: uuid(), ...limpiar(o), ...extra });
  return {
    mesas: SEED.mesasSeed.map((m) => ({ ...m })),
    reservas: SEED.reservasSeed.map((r) =>
      base(r, {
        fecha: r._dia !== undefined ? fechaMas(hoy, r._dia) : r._domingo ? fechaMas(hoy, 7 - dow) : diaAbierto(hoy, r._abierto),
        llegada_at: r._llegada ? haceISO(r._llegada) : null,
        created_at: haceISO(60 * 24 * 2 + Math.floor(Math.random() * 600)),
      }),
    ),
    turnos_micro: SEED.turnosSeed.map((t) => base(t, { created_at: haceISO(t._hace) })),
    dedicatorias: SEED.dedicatoriasSeed.map((d) => base(d, { created_at: haceISO(d._hace) })),
    llamados: SEED.llamadosSeed.map((l) => base(l, { atendido_at: l._atendido ? haceISO(l._hace - l._atendido) : null, created_at: haceISO(l._hace) })),
    lista_espera: SEED.esperaSeed.map((e) => base(e, { created_at: haceISO(e._hace) })),
    clientes: SEED.clientesSeed.map((c) => base(c, { ultima_visita: c._ultima ? fechaMas(hoy, -c._ultima) : null })),
    resenas: SEED.resenasSeed.map((r) => base(r, { created_at: haceISO(r._hace) })),
    fotos: SEED.fotosSeed.map((f) => base(f, { created_at: haceISO(f._hace) })),
    eventos_pantalla: [],
  };
}

function motorLocal() {
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('sy-plataforma') : null;
  const subs = new Set();
  const manejadores = new Map();

  const leer = () => {
    try {
      const db = JSON.parse(localStorage.getItem(CLAVE));
      if (db && db.reservas) return db;
    } catch (e) {}
    const db = generarSeedLocal();
    guardar(db);
    return db;
  };
  const guardar = (db) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(db));
    } catch (e) {
      // Si el localStorage se llena (fotos), se tiran las fotos más viejas.
      db.fotos = db.fotos.slice(-6);
      localStorage.setItem(CLAVE, JSON.stringify(db));
    }
  };
  const avisarCambio = (msg) => {
    subs.forEach((s) => s.tablas.includes(msg.tabla) && s.cb(msg));
  };
  const avisarBroadcast = ({ evento, payload }) => manejadores.get(evento)?.forEach((cb) => cb(payload));

  bc?.addEventListener('message', ({ data }) => {
    if (data.tipo === 'cambio') avisarCambio(data.msg);
    if (data.tipo === 'broadcast') avisarBroadcast(data);
  });

  const comparar = (campo, asc) => (a, b) => {
    const x = a[campo] ?? '';
    const y = b[campo] ?? '';
    return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
  };

  return {
    cliente: null,
    async listar(tabla, { eq = {}, desde, hasta, campoFecha = 'fecha', orden = 'created_at', asc = true, limite } = {}) {
      let filas = leer()[tabla] || [];
      filas = filas.filter((f) => Object.entries(eq).every(([k, v]) => f[k] === v));
      if (desde) filas = filas.filter((f) => f[campoFecha] >= desde);
      if (hasta) filas = filas.filter((f) => f[campoFecha] <= hasta);
      if (orden) filas = [...filas].sort(comparar(orden, asc));
      if (limite) filas = filas.slice(0, limite);
      return filas;
    },
    async insertar(tabla, fila) {
      const db = leer();
      const nueva = { id: uuid(), created_at: new Date().toISOString(), ...fila };
      db[tabla] = [...(db[tabla] || []), nueva];
      guardar(db);
      const msg = { tabla, tipo: 'INSERT', nueva, vieja: null };
      avisarCambio(msg);
      bc?.postMessage({ tipo: 'cambio', msg });
      return nueva;
    },
    async actualizar(tabla, id, cambios) {
      const db = leer();
      const i = (db[tabla] || []).findIndex((f) => f.id === id);
      if (i < 0) throw new Error('No existe el registro');
      const vieja = db[tabla][i];
      const nueva = { ...vieja, ...cambios };
      db[tabla][i] = nueva;
      guardar(db);
      const msg = { tabla, tipo: 'UPDATE', nueva, vieja };
      avisarCambio(msg);
      bc?.postMessage({ tipo: 'cambio', msg });
      return nueva;
    },
    suscribir(tablas, cb) {
      const s = { tablas, cb };
      subs.add(s);
      return () => subs.delete(s);
    },
    async enviar(evento, payload) {
      avisarBroadcast({ evento, payload });
      bc?.postMessage({ tipo: 'broadcast', evento, payload });
    },
    escuchar(evento, cb) {
      if (!manejadores.has(evento)) manejadores.set(evento, new Set());
      manejadores.get(evento).add(cb);
      return () => manejadores.get(evento).delete(cb);
    },
    async subirFoto(blob) {
      // En local la foto se guarda como data URL (ya viene reducida).
      return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
    },
    async reiniciar() {
      guardar(generarSeedLocal());
    },
  };
}

/* ============================================================
   API pública
   ============================================================ */
const motor = modo === 'supabase' ? motorSupabase() : motorLocal();

export const listar = (tabla, opciones) => motor.listar(tabla, opciones);
export const insertar = (tabla, fila) => motor.insertar(tabla, fila);
export const actualizar = (tabla, id, cambios) => motor.actualizar(tabla, id, cambios);
export const enviar = (evento, payload) => motor.enviar(evento, payload);
export const escuchar = (evento, cb) => motor.escuchar(evento, cb);
export const subirFoto = (blob) => motor.subirFoto(blob);

/** Suscribe a cambios en vivo. `tablas` puede ser string o arreglo. */
export function suscribir(tablas, cb) {
  return motor.suscribir([].concat(tablas), cb);
}

export async function obtener(tabla, eq) {
  const filas = await motor.listar(tabla, { eq, orden: null });
  return filas[0] || null;
}

/** Reinicia el demo y avisa a todas las pantallas para que recarguen. */
export async function reiniciarDemo() {
  await motor.reiniciar();
  await motor.enviar('demo-reiniciado', { at: Date.now() });
}

/** Crea o actualiza un cliente por teléfono (CRM y lealtad). */
export async function guardarCliente({ nombre, correo, telefono, ...resto }) {
  const tel = normalizarTelefono(telefono);
  const existente = tel ? await obtener('clientes', { telefono: tel }) : null;
  if (existente) return motor.actualizar('clientes', existente.id, { nombre: nombre || existente.nombre, correo: correo || existente.correo, ...resto });
  return motor.insertar('clientes', { nombre, correo, telefono: tel, visitas: 0, sellos: 0, etiquetas: [], ...resto });
}

/** "+1 (915) 555-0141" -> "+1 915 555 0141"; deja igual lo que no reconoce. */
export function normalizarTelefono(t = '') {
  const d = String(t).replace(/\D/g, '');
  if (d.length === 10) return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('52')) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (d.length === 13 && d.startsWith('521')) return `+52 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return String(t).trim();
}

/** Folio: SY-EP- + yyMMdd + 4 caracteres. */
export function nuevoFolio(fecha = hoyEnElPaso()) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += abc[Math.floor(Math.random() * abc.length)];
  return `SY-EP-${fecha.slice(2).replace(/-/g, '')}${r}`;
}

/** Al reiniciar el demo, cualquier página recarga sus datos. */
export function alReiniciar(cb) {
  return escuchar('demo-reiniciado', cb);
}
