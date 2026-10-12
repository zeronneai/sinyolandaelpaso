// Herramientas para la demo: simular noche, reiniciar, QR de mesas y QR de la demo.

import { ENV } from '../entorno.js';
import { reiniciarDemo, insertar, nuevoFolio, modo } from '../datos.js';
import { datos } from './store.js';
import { $, esc, toast, urlSitio } from '../ui.js';
import { MESAS, nombreZona, mesasOcupadas, horariosDelDia } from '../disponibilidad.js';
import { qrSVG } from '../qr.js';
import { lanzarBrindis } from '../brindis.js';
import { hoyEnElPaso } from '../../js/horario.js';

/* ============================================================
   Simular noche
   ============================================================ */
const NOMBRES = ['Alejandra', 'Brayan', 'Citlali', 'Diego', 'Estefanía', 'Fátima', 'Gerardo', 'Itzel', 'Jorge', 'Lucía', 'Marisol', 'Nayeli', 'Omar', 'Pamela', 'Raúl', 'Sofía', 'Tania', 'Uriel', 'Vianey', 'Yahir'];
const APELLIDOS = ['Gallegos', 'Holguín', 'Ibarra', 'Jáquez', 'Loya', 'Márquez', 'Nájera', 'Ontiveros', 'Payán', 'Quintana', 'Rentería', 'Saenz', 'Terrazas', 'Valles', 'Zubía'];
const CANCIONES = [
  ['Querida', 'Juan Gabriel'], ['El Rey', 'José Alfredo Jiménez'], ['La Puerta Negra', 'Los Tigres del Norte'], ['Mátalas', 'Alejandro Fernández'],
  ['Hasta que te conocí', 'Juan Gabriel'], ['Si nos dejan', 'Luis Miguel'], ['Amor eterno', 'Rocío Dúrcal'], ['Ella', 'José Alfredo Jiménez'],
  ['Te solté la rienda', 'José Alfredo Jiménez'], ['Inolvidable', 'Luis Miguel'], ['Costumbres', 'Rocío Dúrcal'], ['Me nace del corazón', 'Juan Gabriel'],
  ['Tu recuerdo y yo', 'José Alfredo Jiménez'], ['Bohemio de afición', 'Javier Solís'], ['Contigo aprendí', 'Armando Manzanero'],
];
const PARA = ['Mi ex', 'La cumpleañera', 'El Brayan', 'Todas las solteras', 'Mi compadre', 'La novia', 'El que me dejó en visto', 'Mi suegra (no)', 'La mesa 4'];
const MENSAJES = ['Ojalá te duela tantito.', 'Feliz cumple, que este año sí te contesten.', 'Ya ni me acuerdo de ti. Bueno, poquito.', 'Salud por los que no nos supieron querer.', 'Para que sepas que aquí sigo, cantando.', 'Esta va con todo mi rencor y cariño.'];
const FOTOS = ['/assets/fotos/ig_singing.jpg', '/assets/fotos/ig_green.jpg', '/assets/fotos/jarrito.jpg', '/assets/fotos/mic.jpg', '/assets/fotos/ig_neon.jpg'];
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const mesaAzar = () => azar(MESAS).id;

async function pasoSimulacion() {
  const tipo = azar(['reserva', 'turno', 'turno', 'dedicatoria', 'dedicatoria', 'llamado', 'llamado', 'foto', 'espera']);
  const [cancion, artista] = azar(CANCIONES);
  const nombre = `${azar(NOMBRES)} ${azar(APELLIDOS)}`;
  if (tipo === 'reserva') {
    const fecha = hoyEnElPaso();
    const delDia = datos.reservas.filter((r) => r.fecha === fecha);
    const horas = horariosDelDia(fecha);
    const h = horas.length ? azar(horas) : azar(['20:00', '20:30', '21:00', '21:30', '22:00']);
    const personas = azar([2, 2, 3, 4, 4, 6]);
    const libres = MESAS.filter((m) => m.capacidad >= personas && !mesasOcupadas(delDia, h).has(m.id));
    const mesa = libres.length ? azar(libres) : null;
    await insertar('reservas', {
      folio: nuevoFolio(), fecha, hora: h, personas, mesa_id: mesa?.id ?? null, zona: mesa?.zona ?? null,
      nombre, correo: `${nombre.split(' ')[0].toLowerCase()}@example.com`, telefono: `+1 915 555 0${Math.floor(100 + Math.random() * 899)}`,
      ocasion: azar(['cantar', 'cantar', 'cumpleanos', 'despedida', 'divorcio']), corazon_roto: Math.random() < 0.4,
      comentarios: null, extras: [], estado: 'pendiente', deposito_estado: 'no_aplica', monto_deposito: 0,
      source: azar(['instagram', 'instagram', 'tiktok', 'google', 'creador-lalo', 'directo']),
    });
  } else if (tipo === 'turno') {
    await insertar('turnos_micro', { mesa: mesaAzar(), nombre: nombre.split(' ')[0], cancion, artista, estado: 'en_fila' });
  } else if (tipo === 'dedicatoria') {
    const anonimo = Math.random() < 0.4;
    await insertar('dedicatorias', { mesa: mesaAzar(), cancion, para: azar(PARA), mensaje: azar(MENSAJES), anonimo, estado: 'en_fila' });
  } else if (tipo === 'llamado') {
    await insertar('llamados', { mesa: mesaAzar(), tipo: azar(['mesero', 'mesero', 'cuenta', 'ayuda']), estado: 'pendiente', atendido_at: null });
  } else if (tipo === 'foto') {
    await insertar('fotos', { mesa: mesaAzar(), url: azar(FOTOS), estado: 'pendiente' });
  } else {
    await insertar('lista_espera', { nombre, telefono: `+1 915 555 0${Math.floor(100 + Math.random() * 899)}`, personas: azar([2, 3, 4, 5]), estado: 'esperando' });
  }
}

let simTimer = null;
const simulando = () => Boolean(simTimer);
function programar() {
  simTimer = setTimeout(async () => {
    await pasoSimulacion().catch(() => {});
    if (simTimer) programar();
  }, 6000 + Math.random() * 6000);
}
function alternarSimulacion() {
  if (simTimer) {
    clearTimeout(simTimer);
    simTimer = null;
  } else {
    pasoSimulacion();
    programar();
  }
}

/* ============================================================
   Vista Demo
   ============================================================ */
const demoVista = {
  id: 'demo',
  titulo: 'Demo',
  icono: 'destello',
  montar(el) {
    el.innerHTML = `
      <div class="demo-grid">
        <section class="panel">
          <h2 class="panel__t">Simular noche</h2>
          <p>Cada 6 a 12 segundos entra algo al azar: reservas, turnos al micro, dedicatorias, llamados, fotos y gente en espera. Así el admin y la pantalla se ven vivos.</p>
          <button type="button" class="btn btn--mostaza btn--grande" id="sim">${simulando() ? '⏸ Pausar simulación' : '▶ Simular noche'}</button>
          <p class="sim-estado" id="sim-estado">${simulando() ? 'Simulando... la noche está prendida.' : 'Apagada.'}</p>
        </section>
        <section class="panel">
          <h2 class="panel__t">El brindis</h2>
          <p>Manda el brindis de medianoche a todas las pantallas y a todos los celulares con la mesa abierta. A las 12:00 AM sale solo.</p>
          <button type="button" class="btn btn--rosa btn--grande" id="demo-brindis">🥂 Lanzar brindis</button>
        </section>
        <section class="panel">
          <h2 class="panel__t">Reiniciar demo</h2>
          <p>Borra todo lo que se hizo y vuelve a cargar los datos de ejemplo en todas las pantallas.</p>
          <button type="button" class="btn btn--terracota btn--grande" id="reiniciar">Reiniciar demo</button>
        </section>
        <section class="panel">
          <h2 class="panel__t">Abrir otras vistas</h2>
          <div class="botones">
            <a class="btn" href="/pantalla/" target="_blank">Pantalla del bar</a>
            <a class="btn" href="/mesa/?m=12" target="_blank">Mesa 12</a>
            <a class="btn" href="/reservaciones/" target="_blank">Reservaciones</a>
          </div>
          <p class="ayuda ayuda--clara">Motor de datos: <strong>${modo === 'supabase' ? 'Supabase (en vivo entre dispositivos)' : 'local (solo este navegador)'}</strong>${ENV.demo ? ' · modo demo' : ''}</p>
        </section>
      </div>

      <section class="panel qr-demo">
        <h2 class="panel__t">QR de la demo</h2>
        <p>Para que en la junta lo escaneen con su celular.</p>
        <div class="qr-demo__grid" id="qr-demo"></div>
      </section>

      <section class="panel">
        <h2 class="panel__t">Imprimir QR de mesas</h2>
        <p>Una hoja con el QR de cada mesa. Cada uno abre la app de la mesa.</p>
        <button type="button" class="btn btn--mostaza" id="imprimir">Imprimir QR de mesas</button>
      </section>`;

    $('#sim').addEventListener('click', () => {
      alternarSimulacion();
      $('#sim').textContent = simulando() ? '⏸ Pausar simulación' : '▶ Simular noche';
      $('#sim-estado').textContent = simulando() ? 'Simulando... la noche está prendida.' : 'Apagada.';
    });
    $('#demo-brindis').addEventListener('click', () => lanzarBrindis('admin'));
    $('#reiniciar').addEventListener('click', async () => {
      if (!confirm('¿Reiniciar el demo? Se borra todo lo que se hizo.')) return;
      await reiniciarDemo();
      toast('Demo reiniciado. Todo como nuevo.', { tipo: 'reserva', icono: 'sol' });
    });
    $('#imprimir').addEventListener('click', imprimirQRs);
    pintarQRDemo();
  },
};

async function pintarQRDemo() {
  const items = [
    ['Aparta tu mesa', '/reservaciones/', 'Reserva como cliente'],
    ['Mesa 12', '/mesa/?m=12', 'Menú, micro y dedicatorias'],
  ];
  const html = await Promise.all(
    items.map(async ([t, ruta, sub]) => {
      const url = urlSitio(ruta);
      return `<figure class="qr-demo__item"><div class="qr-demo__qr">${await qrSVG(url)}</div>
        <figcaption><strong>${t}</strong><span>${sub}</span><a href="${url}" target="_blank">${esc(url)}</a></figcaption></figure>`;
    }),
  );
  const cont = $('#qr-demo');
  if (cont) cont.innerHTML = html.join('');
}

async function imprimirQRs() {
  const tarjetas = await Promise.all(
    MESAS.map(async (m) => `<div class="qr-mesa">
      <div class="qr-mesa__top"><span class="logo"></span></div>
      <p class="qr-mesa__num">Mesa ${m.numero}</p>
      <p class="qr-mesa__zona">${esc(nombreZona(m.zona))}</p>
      <div class="qr-mesa__qr">${await qrSVG(urlSitio(`/mesa/?m=${m.numero}`))}</div>
      <p class="qr-mesa__txt">Escanéame: menú, micro y dedicatorias</p>
    </div>`),
  );
  let zona = $('#zona-imprimir');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'zona-imprimir';
    document.body.append(zona);
  }
  zona.innerHTML = tarjetas.join('');
  document.body.classList.add('imprimiendo');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('imprimiendo');
  }, 300);
}

export const VISTAS_DEMO = ENV.demo ? [demoVista] : [];
