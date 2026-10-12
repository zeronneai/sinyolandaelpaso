// Estado en memoria del admin, sincronizado en vivo con la base.

import { listar, suscribir, alReiniciar } from '../datos.js';

const TABLAS = ['reservas', 'lista_espera', 'dedicatorias', 'turnos_micro', 'llamados', 'fotos', 'clientes', 'resenas'];

export const datos = Object.fromEntries(TABLAS.map((t) => [t, []]));
const oyentes = new Set();

export const alCambiar = (cb) => {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
};
const avisar = (cambio) => oyentes.forEach((cb) => cb(cambio));

export async function cargarTodo() {
  const resultados = await Promise.all(
    TABLAS.map((t) => listar(t, { orden: t === 'clientes' ? 'nombre' : t === 'reservas' ? 'hora' : 'created_at' })),
  );
  TABLAS.forEach((t, i) => (datos[t] = resultados[i] || []));
  avisar({ tabla: '*', tipo: 'CARGA' });
}

export function iniciarStore() {
  suscribir(TABLAS, (cambio) => {
    const { tabla, tipo, nueva, vieja } = cambio;
    const lista = datos[tabla];
    if (tipo === 'DELETE') {
      datos[tabla] = lista.filter((f) => f.id !== vieja?.id);
    } else if (nueva) {
      const i = lista.findIndex((f) => f.id === nueva.id);
      if (i >= 0) lista[i] = { ...lista[i], ...nueva };
      else lista.push(nueva);
    }
    avisar(cambio);
  });
  alReiniciar(() => cargarTodo());
  return cargarTodo();
}
