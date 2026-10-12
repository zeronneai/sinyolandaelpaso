// Pantalla del bar: rota cada 10 segundos entre micro, dedicatoria, fotos,
// cuenta regresiva al brindis y el QR de la mesa. Todo en vivo.

import { listar, suscribir } from './datos.js';
import { $, esc, iniciarPlataforma, urlSitio } from './ui.js';
import { escucharBrindis, segundosParaMedianoche } from './brindis.js';
import { qrSVG } from './qr.js';

const ROTACION_MS = 10000;
const E = { turnos: [], dedicatorias: [], fotos: [] };
let indice = 0;
let indiceFoto = 0;
let timer = null;
let qrMesa = '';

iniciarPlataforma({ recargar: () => cargar() });

async function cargar() {
  const [t, d, f] = await Promise.all([listar('turnos_micro'), listar('dedicatorias'), listar('fotos')]);
  E.turnos = t;
  E.dedicatorias = d;
  E.fotos = f;
}

const fila = () => E.turnos.filter((t) => t.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at));
const dedicActual = () => E.dedicatorias.filter((d) => d.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
const fotosOk = () => E.fotos.filter((f) => f.estado === 'aprobada').sort((a, b) => b.created_at.localeCompare(a.created_at));

/* ---------- Diapositivas ---------- */
const DIAPOS = [
  {
    id: 'micro',
    hay: () => true,
    html: () => {
      const ahora = E.turnos.find((t) => t.estado === 'cantando');
      const sig = fila()[0];
      return `<section class="d d--micro">
        <div class="d-micro__ahora">
          <p class="d__eti">Ahora canta</p>
          ${ahora
            ? `<p class="d__gigante">${esc(ahora.nombre)}</p><p class="d__cancion">${esc(ahora.cancion)}${ahora.artista ? ` <span>· ${esc(ahora.artista)}</span>` : ''}</p><p class="d__mesa">Mesa ${ahora.mesa}</p>`
            : `<p class="d__gigante">¡El micro te espera!</p><p class="d__cancion">Escanea el QR de tu mesa y apúntate</p>`}
        </div>
        <div class="d-micro__sigue">
          <p class="d__eti d__eti--rosa">Sigue</p>
          ${sig ? `<p class="d__mediano">${esc(sig.nombre)}</p><p class="d__chico">${esc(sig.cancion)} · Mesa ${sig.mesa}</p>` : '<p class="d__chico">Nadie en la fila. ¡Cáile!</p>'}
          ${fila().length > 1 ? `<p class="d__fila">Y ${fila().length - 1} más en la fila</p>` : ''}
        </div>
      </section>`;
    },
  },
  {
    id: 'dedic',
    hay: () => Boolean(dedicActual()),
    html: () => {
      const d = dedicActual();
      return `<section class="d d--dedic">
        <div class="marquesina">
          <div class="marquesina__focos" aria-hidden="true"></div>
          <p class="d__eti">Esta va dedicada</p>
          <p class="marquesina__para">Para ${esc(d.para)}</p>
          <p class="marquesina__cancion">"${esc(d.cancion)}"</p>
          ${d.mensaje ? `<p class="marquesina__msg">${esc(d.mensaje)}</p>` : ''}
          <p class="marquesina__de">${d.anonimo ? 'De: un admirador secreto' : `De: la mesa ${d.mesa}`}</p>
        </div>
      </section>`;
    },
  },
  {
    id: 'fotos',
    hay: () => fotosOk().length > 0,
    html: () => {
      const fs = fotosOk();
      const f = fs[indiceFoto++ % fs.length];
      return `<section class="d d--foto">
        <figure class="polaroid"><img src="${esc(f.url)}" alt=""><figcaption>Mesa ${f.mesa ?? ''} · #SinYolanda</figcaption></figure>
        <div class="d-foto__txt"><p class="d__eti">El muro</p><p class="d__mediano">Sube tu foto desde tu mesa</p><p class="d__chico">y sale aquí en la pantalla</p></div>
      </section>`;
    },
  },
  {
    id: 'brindis',
    hay: () => true,
    html: () => `<section class="d d--brindis">
      <p class="d__eti">Brindis de medianoche</p>
      <p class="cuenta-gigante" id="cuenta-brindis">${formatoCuenta()}</p>
      <p class="d__mediano">¡Salud, y que siga la fiesta!</p>
    </section>`,
  },
  {
    id: 'qr',
    hay: () => true,
    html: () => `<section class="d d--qr">
      <div class="d-qr__qr">${qrMesa}</div>
      <div><p class="d__eti">Escanea el QR de tu mesa</p>
      <p class="d__gigante">Menú, micro y dedicatorias</p>
      <p class="d__chico">Sin descargar nada. Apúntate a cantar y dedícale una a tu bola.</p></div>
    </section>`,
  },
];

function formatoCuenta() {
  const s = segundosParaMedianoche();
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function mostrar(i) {
  const disponibles = DIAPOS.filter((d) => d.hay());
  const d = disponibles[i % disponibles.length];
  const cont = $('#diapositivas');
  cont.innerHTML = d.html();
  cont.firstElementChild?.classList.add('d--entra');
  cont.dataset.actual = d.id;
  $('#puntos').innerHTML = disponibles.map((x) => `<span class="${x.id === d.id ? 'activo' : ''}"></span>`).join('');
}
function siguiente() {
  indice++;
  mostrar(indice);
}
function arrancarRotacion() {
  clearInterval(timer);
  timer = setInterval(siguiente, ROTACION_MS);
}

/** Repinta la diapositiva actual si cambian sus datos (sin reiniciar el tiempo). */
function refrescar(tabla) {
  const actual = $('#diapositivas').dataset.actual;
  const afecta = { turnos_micro: 'micro', dedicatorias: 'dedic', fotos: 'fotos' }[tabla];
  if (afecta === actual) mostrar(indice);
}

/* ---------- Reloj y cuenta ---------- */
setInterval(() => {
  $('#reloj').textContent = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
  const c = $('#cuenta-brindis');
  if (c) c.textContent = formatoCuenta();
}, 1000);

/* ---------- Pantalla completa ---------- */
$('#completa').addEventListener('click', () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', () => ($('#completa').hidden = Boolean(document.fullscreenElement)));

/* ---------- Arranque ---------- */
(async () => {
  qrMesa = await qrSVG(urlSitio('/mesa/?m=12'));
  await cargar();
  mostrar(0);
  arrancarRotacion();
  escucharBrindis();
  suscribir(['turnos_micro', 'dedicatorias', 'fotos'], ({ tabla, nueva }) => {
    const lista = { turnos_micro: E.turnos, dedicatorias: E.dedicatorias, fotos: E.fotos }[tabla];
    const i = lista.findIndex((x) => x.id === nueva.id);
    if (i >= 0) lista[i] = { ...lista[i], ...nueva };
    else lista.push(nueva);
    refrescar(tabla);
    // Una foto recién aprobada salta a la pantalla de inmediato.
    if (tabla === 'fotos' && nueva.estado === 'aprobada') {
      indiceFoto = 0;
      const disp = DIAPOS.filter((d) => d.hay());
      indice = disp.findIndex((d) => d.id === 'fotos');
      mostrar(indice);
      arrancarRotacion();
    }
  });
})();
