import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { estadoApertura, ahoraEnElPaso, formatoHora, proximaFecha, DIAS } from './horario.js';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const LANG = html.lang.startsWith('en') ? 'en' : 'es';
const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TXT = {
  es: {
    abierto: (h) => `Abierto ahora · cierra a las ${h}`,
    cerradoHoy: (h) => `Cerrado ahora · abrimos hoy a las ${h}`,
    cerradoManana: (h) => `Cerrado ahora · abrimos mañana a las ${h}`,
    cerradoDia: (d, h) => `Cerrado ahora · abrimos el ${d.toLowerCase()} a las ${h}`,
  },
  en: {
    abierto: (h) => `Open now · closes at ${h}`,
    cerradoHoy: (h) => `Closed now · opens today at ${h}`,
    cerradoManana: (h) => `Closed now · opens tomorrow at ${h}`,
    cerradoDia: (d, h) => `Closed now · opens ${d} at ${h}`,
  },
}[LANG];

/* ============================================================
   CORTINA
   ============================================================ */
function iniciarCortina() {
  const cortina = document.getElementById('cortina');
  if (!cortina || !html.classList.contains('con-cortina')) return;

  const panel = cortina.querySelector('.cortina__panel');
  const rodillo = cortina.querySelector('.cortina__rodillo');
  const pintura = cortina.querySelector('.grafiti__pintura');
  const boquilla = cortina.querySelector('.grafiti__boquilla');
  const lienzo = cortina.querySelector('.grafiti__lienzo');
  const escurridos = cortina.querySelectorAll('.escurrido');
  const tags = cortina.querySelectorAll('.tag');
  const btnJalar = document.getElementById('cortina-jalar');
  const btnSaltar = document.getElementById('cortina-saltar');
  const contenido = document.getElementById('contenido');
  const hero = document.querySelector('.hero__contenido');

  let abierta = false;
  const marcarVista = () => {
    try { sessionStorage.setItem('sy-cortina', '1'); } catch (e) {}
  };

  // El resto de la página no debe recibir foco mientras la cortina está abajo.
  const fondo = [document.getElementById('nav'), contenido, document.querySelector('.footer')];
  fondo.forEach((el) => el && (el.inert = true));

  // 1) Pintar el logo con aerosol, de izquierda a derecha.
  const intro = gsap.timeline({ delay: 0.35 });
  // Posición del lienzo relativa a .grafiti, que es donde vive la boquilla.
  const grafiti = cortina.querySelector('.grafiti');
  const caja = () => {
    const g = grafiti.getBoundingClientRect();
    const l = lienzo.getBoundingClientRect();
    return { izq: l.left - g.left, der: l.right - g.left, arriba: l.top - g.top, alto: l.height };
  };
  intro
    .set(boquilla, { opacity: 1, x: () => caja().izq - 35, y: () => caja().arriba + caja().alto * 0.3 - 35 })
    .to(pintura, { '--pintado': '100%', duration: 1.8, ease: 'power1.inOut' }, 0)
    .to(boquilla, { x: () => caja().der - 35, duration: 1.8, ease: 'power1.inOut' }, 0)
    .to(boquilla, { y: '+=60', duration: 0.3, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0)
    .to(boquilla, { opacity: 0, duration: 0.25 }, 1.7)
    .to(escurridos, { scaleY: 1, duration: 1.4, ease: 'power2.out', stagger: { each: 0.12, from: 'random' } }, 1.5)
    .fromTo(tags, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', stagger: 0.25 }, 1.9);

  // Foco en el botón principal para que funcione con teclado desde el inicio.
  btnJalar.focus({ preventScroll: true, focusVisible: false });

  // 2) Enrollar la cortina hacia arriba.
  function abrir({ rapido = false } = {}) {
    if (abierta) return;
    abierta = true;
    intro.progress(1);
    marcarVista();
    quitarEscuchas();

    const fin = () => {
      html.classList.remove('con-cortina');
      cortina.remove();
      fondo.forEach((el) => el && (el.inert = false));
      contenido.focus({ preventScroll: true });
      ScrollTrigger.refresh();
    };

    if (rapido) {
      gsap.to(cortina, { opacity: 0, duration: 0.3, onComplete: fin });
      return;
    }

    gsap.timeline({ onComplete: fin })
      // el jalón hacia abajo antes de subir
      .to(btnSaltar, { opacity: 0, duration: 0.2 }, 0)
      .to(panel, { y: 22, duration: 0.18, ease: 'power1.out' }, 0)
      .to(panel, { yPercent: -100, y: 0, duration: 1.05, ease: 'power3.inOut' })
      .fromTo(hero, { scale: 1.05, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.25)
      // pequeño rebote del rodillo al terminar de enrollar
      .to(rodillo, { y: -6, duration: 0.12, ease: 'power1.out' }, '-=0.05')
      .to(rodillo, { y: 0, duration: 0.5, ease: 'bounce.out' })
      .to(rodillo, { yPercent: -110, duration: 0.35, ease: 'power2.in' }, '+=0.05');
  }

  // Disparadores: clic o tap, rueda del mouse, swipe hacia arriba y teclado.
  const alClic = (e) => {
    if (e.target.closest('#cortina-saltar')) return;
    abrir();
  };
  const alRueda = (e) => {
    if (Math.abs(e.deltaY) > 4) abrir();
  };
  let toqueY = null;
  const alTocar = (e) => { toqueY = e.touches[0].clientY; };
  const alMover = (e) => {
    if (toqueY !== null && toqueY - e.touches[0].clientY > 30) abrir();
  };
  const alTecla = (e) => {
    if (e.key === 'Escape') abrir({ rapido: true });
    else if (['ArrowUp', 'ArrowDown', 'PageDown', 'PageUp', ' ', 'Enter'].includes(e.key) && !e.target.closest('#cortina-saltar')) {
      e.preventDefault();
      abrir();
    } else if (e.key === 'Tab') {
      // Trampa de foco entre los dos botones de la cortina.
      e.preventDefault();
      (document.activeElement === btnJalar ? btnSaltar : btnJalar).focus();
    }
  };
  const alSaltar = () => abrir({ rapido: true });

  panel.addEventListener('click', alClic);
  window.addEventListener('wheel', alRueda, { passive: true });
  panel.addEventListener('touchstart', alTocar, { passive: true });
  panel.addEventListener('touchmove', alMover, { passive: true });
  document.addEventListener('keydown', alTecla);
  btnSaltar.addEventListener('click', alSaltar);

  function quitarEscuchas() {
    panel.removeEventListener('click', alClic);
    window.removeEventListener('wheel', alRueda);
    panel.removeEventListener('touchstart', alTocar);
    panel.removeEventListener('touchmove', alMover);
    document.removeEventListener('keydown', alTecla);
    btnSaltar.removeEventListener('click', alSaltar);
  }
}

/* ============================================================
   MENÚ MÓVIL
   ============================================================ */
function iniciarMenu() {
  const burger = document.getElementById('nav-burger');
  const menu = document.getElementById('nav-menu');
  if (!burger || !menu) return;
  const movil = window.matchMedia('(max-width: 1023px)');

  const cerrar = (devolverFoco = false) => {
    html.classList.remove('menu-abierto');
    burger.setAttribute('aria-expanded', 'false');
    if (devolverFoco) burger.focus();
  };
  burger.addEventListener('click', () => {
    const abrir = burger.getAttribute('aria-expanded') !== 'true';
    html.classList.toggle('menu-abierto', abrir);
    burger.setAttribute('aria-expanded', String(abrir));
    if (abrir) menu.querySelector('a')?.focus();
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) cerrar(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && html.classList.contains('menu-abierto')) cerrar(true);
  });
  movil.addEventListener('change', () => cerrar());
}

/* ============================================================
   ABIERTO AHORA / CERRADO (hora de El Paso)
   ============================================================ */
function iniciarEstado() {
  const el = document.getElementById('estado-apertura');
  const actualizar = () => {
    const est = estadoApertura();
    if (el) {
      let texto = '';
      if (est.abierto) texto = TXT.abierto(formatoHora(est.cierra));
      else if (est.proximo?.hoy) texto = TXT.cerradoHoy(formatoHora(est.proximo.abre));
      else if (est.proximo?.manana) texto = TXT.cerradoManana(formatoHora(est.proximo.abre));
      else if (est.proximo) texto = TXT.cerradoDia(DIAS[LANG][est.proximo.dia], formatoHora(est.proximo.abre));
      el.querySelector('.estado__texto').textContent = texto;
      el.classList.toggle('estado--abierto', est.abierto);
      el.classList.toggle('estado--cerrado', !est.abierto);
      el.hidden = false;
    }
    // Resalta el día de hoy en las tablas de horario.
    const { dia } = ahoraEnElPaso();
    document.querySelectorAll('.horario tr[data-dias]').forEach((tr) => {
      tr.classList.toggle('hoy', tr.dataset.dias.split(',').map(Number).includes(dia));
    });
  };
  actualizar();
  setInterval(actualizar, 60 * 1000);
}

/* ============================================================
   "APARTAR PARA ESTE DÍA" / "COTIZAR": abre /reservaciones/ con la
   fecha y la ocasión ya llenas.
   ============================================================ */
function iniciarPrellenado() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reservar]');
    if (!btn) return;
    e.preventDefault();
    const p = new URLSearchParams();
    if (btn.dataset.ocasion) p.set('ocasion', btn.dataset.ocasion);
    if (btn.dataset.dia !== undefined) p.set('fecha', proximaFecha(Number(btn.dataset.dia)));
    const utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) p.set('utm_source', utm);
    location.href = `/reservaciones/?${p}`;
  });
}

/* ============================================================
   NAVEGACIÓN DEL MENÚ: marca la categoría visible
   ============================================================ */
function iniciarMenuNav() {
  const links = [...document.querySelectorAll('.menu-nav a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const porId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = porId.get(en.target.id);
        if (a) {
          a.setAttribute('aria-current', 'true');
          a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducido ? 'auto' : 'smooth' });
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  document.querySelectorAll('.menu-cat').forEach((s) => io.observe(s));
}

/* ============================================================
   ENTRADAS CON SCROLL
   ============================================================ */
function iniciarEntradas() {
  if (reducido) return;
  gsap.utils.toArray('[data-entra]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  gsap.utils.toArray('[data-entra-grupo]').forEach((grupo) => {
    gsap.from(grupo.children, {
      y: 50,
      opacity: 0,
      rotate: (i) => (i % 2 ? 3 : -3),
      duration: 0.7,
      ease: 'back.out(1.4)',
      stagger: 0.1,
      clearProps: 'transform,opacity,rotate',
      scrollTrigger: { trigger: grupo, start: 'top 85%', once: true },
    });
  });
}

iniciarCortina();
iniciarMenu();
iniciarEstado();
iniciarPrellenado();
iniciarMenuNav();
iniciarEntradas();
