// Acciones del admin sobre la base. Marca lo que hace esta pestaña para no
// mostrarse toasts de sus propios cambios.

import { actualizar, insertar, obtener, guardarCliente, nuevoFolio } from '../datos.js';
import { hoyEnElPaso, ahoraEnElPaso } from '../../js/horario.js';

const propios = new Map(); // id -> expira

export function marcarPropio(id) {
  propios.set(id, Date.now() + 4000);
}
export function esPropio({ nueva, vieja }) {
  const id = nueva?.id ?? vieja?.id;
  const exp = propios.get(id);
  return Boolean(exp && exp > Date.now());
}

export async function cambiar(tabla, id, cambios) {
  marcarPropio(id);
  return actualizar(tabla, id, cambios);
}

export async function crear(tabla, fila) {
  const r = await insertar(tabla, fila);
  marcarPropio(r.id);
  return r;
}

export const ESTADOS_RESERVA = {
  pendiente: 'Por confirmar',
  confirmada: 'Confirmada',
  llego: 'Llegó',
  sentada: 'Sentada',
  se_fue: 'Se fue',
  no_llego: 'No llegó',
  cancelada: 'Cancelada',
};
export const BOTONES_ESTADO = [
  ['confirmada', 'Confirmar'],
  ['llego', 'Llegó'],
  ['sentada', 'Sentada'],
  ['se_fue', 'Se fue'],
  ['no_llego', 'No llegó'],
];

export async function cambiarEstadoReserva(r, estado) {
  const cambios = { estado };
  if ((estado === 'llego' || estado === 'sentada') && !r.llegada_at) cambios.llegada_at = new Date().toISOString();
  const nueva = await cambiar('reservas', r.id, cambios);
  // Primera vez que llega: cuenta la visita en el CRM.
  if (estado === 'llego' && !r.llegada_at && r.telefono) {
    const c = await obtener('clientes', { telefono: r.telefono }).catch(() => null);
    if (c) await cambiar('clientes', c.id, { visitas: (c.visitas || 0) + 1, ultima_visita: hoyEnElPaso() });
    else await guardarCliente({ nombre: r.nombre, correo: r.correo, telefono: r.telefono, visitas: 1, ultima_visita: hoyEnElPaso() });
  }
  return nueva;
}

/** Hora actual redondeada a 15 min, como 'HH:MM'. */
export function horaAhora() {
  const { minutos } = ahoraEnElPaso();
  const m = Math.floor(minutos / 15) * 15;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export async function registrarWalkIn({ nombre, personas, mesa_id, telefono = '' }) {
  return crear('reservas', {
    folio: nuevoFolio(),
    fecha: hoyEnElPaso(),
    hora: horaAhora(),
    personas,
    mesa_id,
    zona: null,
    nombre: nombre || 'Walk-in',
    correo: '',
    telefono,
    ocasion: 'cantar',
    corazon_roto: false,
    comentarios: null,
    extras: [],
    estado: 'sentada',
    deposito_estado: 'no_aplica',
    monto_deposito: 0,
    source: 'walk-in',
    llegada_at: new Date().toISOString(),
  });
}
