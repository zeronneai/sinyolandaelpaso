// El brindis de medianoche: un broadcast que prende al mismo tiempo todas
// las pantallas del bar y todos los celulares con /mesa/ abierta.

import { enviar, escuchar, insertar } from './datos.js';
import { sonar } from './ui.js';

const COLORES = ['#E0A63A', '#F3E4C8', '#E8879A', '#C4502A', '#3B1F14', '#E2571E'];

/** Lanza el brindis a todos (lo llama el admin). */
export async function lanzarBrindis(origen = 'admin') {
  const payload = { at: Date.now(), origen };
  await enviar('brindis', payload);
  insertar('eventos_pantalla', { tipo: 'brindis', payload }).catch(() => {});
}

/** Escucha el broadcast y muestra la animación a pantalla completa. */
export function escucharBrindis({ conSonido = true } = {}) {
  return escuchar('brindis', () => mostrarBrindis({ conSonido }));
}

let activo = false;
export function mostrarBrindis({ conSonido = true } = {}) {
  if (activo) return;
  activo = true;
  const capa = document.createElement('div');
  capa.className = 'brindis';
  capa.setAttribute('role', 'alert');
  capa.innerHTML = `
    <div class="brindis__sol" aria-hidden="true"></div>
    <canvas class="brindis__confeti" aria-hidden="true"></canvas>
    <p class="brindis__cuenta" aria-hidden="true"></p>
    <div class="brindis__final" hidden>
      <p class="brindis__salud">¡Salud,<br><span>y que siga la fiesta!</span></p>
      <p class="brindis__sub">Brindis de medianoche · Sin Yolanda El Paso</p>
    </div>`;
  document.body.append(capa);
  navigator.vibrate?.([80, 120, 80, 120, 80, 120, 300]);

  const cuenta = capa.querySelector('.brindis__cuenta');
  const pasos = ['3', '2', '1'];
  let i = 0;
  const tic = () => {
    if (i < pasos.length) {
      cuenta.textContent = pasos[i];
      cuenta.classList.remove('brindis__cuenta--pop');
      void cuenta.offsetWidth;
      cuenta.classList.add('brindis__cuenta--pop');
      if (conSonido) sonar('ding');
      i++;
      setTimeout(tic, 1000);
    } else {
      cuenta.hidden = true;
      capa.querySelector('.brindis__final').hidden = false;
      if (conSonido) sonar('brindis');
      confeti(capa.querySelector('.brindis__confeti'));
      setTimeout(() => {
        capa.classList.add('brindis--saliendo');
        setTimeout(() => {
          capa.remove();
          activo = false;
        }, 700);
      }, 6500);
    }
  };
  tic();
  capa.addEventListener('click', () => {
    if (!capa.querySelector('.brindis__final').hidden) {
      capa.remove();
      activo = false;
    }
  });
}

/** Confeti de papel picado: rectangulitos con recortes que caen girando. */
function confeti(canvas) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ajustar = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  ajustar();
  const N = reducido ? 30 : Math.min(220, Math.floor(innerWidth / 5));
  const piezas = Array.from({ length: N }, () => ({
    x: Math.random() * canvas.width,
    y: -Math.random() * canvas.height * 0.8,
    w: (14 + Math.random() * 18) * dpr,
    h: (18 + Math.random() * 20) * dpr,
    vy: (2 + Math.random() * 3.5) * dpr,
    vx: (Math.random() - 0.5) * 2 * dpr,
    giro: Math.random() * Math.PI,
    vg: (Math.random() - 0.5) * 0.2,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    fase: Math.random() * Math.PI * 2,
  }));
  const inicio = performance.now();
  const cuadro = (t) => {
    if (!canvas.isConnected) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of piezas) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t / 400 + p.fase) * 0.8 * dpr;
      p.giro += p.vg;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.scale(Math.cos(t / 300 + p.fase), 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      // recortes del papel picado
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, -p.h * 0.1, p.w * 0.16, 0, Math.PI * 2);
      ctx.moveTo(-p.w * 0.3, p.h * 0.25);
      ctx.lineTo(-p.w * 0.15, p.h * 0.1);
      ctx.lineTo(0, p.h * 0.25);
      ctx.lineTo(p.w * 0.15, p.h * 0.1);
      ctx.lineTo(p.w * 0.3, p.h * 0.25);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      if (p.y > canvas.height + 40 && t - inicio < 4500) {
        p.y = -40;
        p.x = Math.random() * canvas.width;
      }
    }
    if (t - inicio < 8000) requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
}

/** Brindis automático a las 12:00 AM (hora de El Paso), si la página está abierta. */
export function brindisAutomatico(lanzar) {
  let ultimo = null;
  setInterval(() => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const h = Number(p.find((x) => x.type === 'hour').value);
    const m = Number(p.find((x) => x.type === 'minute').value);
    const clave = new Date().toDateString();
    if (h === 0 && m === 0 && ultimo !== clave) {
      ultimo = clave;
      lanzar();
    }
  }, 15000);
}

/** Segundos que faltan para la medianoche en El Paso. */
export function segundosParaMedianoche() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return 86400 - (g('hour') * 3600 + g('minute') * 60 + g('second'));
}
