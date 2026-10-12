// Datos de demo. Una sola fuente para el modo local (navegador) y para
// supabase/seed.sql (lo genera `npm run seed`).
//
// Fechas relativas: `_dia: 0` es hoy; `_abierto: n` es el n-ésimo día abierto
// después de hoy (sin lunes ni martes); `_domingo: true` es el próximo domingo
// (para el Recovery Brunch). `_hace` son minutos antes de ahora.

import planoMesas from '../data/mesas.json' with { type: 'json' };

export const mesasSeed = planoMesas.mesas;

const r = (o) => ({ extras: [], corazon_roto: false, comentarios: null, deposito_estado: 'no_aplica', monto_deposito: 0, ...o });

export const reservasSeed = [
  // ----- Hoy -----
  r({ folio: 'SY-EP-DEMO01', _dia: 0, hora: '19:00', personas: 4, mesa_id: 2, zona: 'cerca-micro', nombre: 'Valeria Domínguez', correo: 'valeria.dominguez@example.com', telefono: '+1 915 555 0141', ocasion: 'cumpleanos', estado: 'sentada', _llegada: 35, source: 'instagram', extras: [{ id: 'pastel', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 35 }),
  r({ folio: 'SY-EP-DEMO02', _dia: 0, hora: '19:30', personas: 8, mesa_id: 5, zona: 'cerca-micro', nombre: 'Mariana Treviño', correo: 'mariana.trevino@example.com', telefono: '+52 656 555 0192', ocasion: 'despedida', estado: 'llego', _llegada: 6, corazon_roto: false, source: 'tiktok', extras: [{ id: 'despedida', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 50, comentarios: 'Somos 8 y la novia no sabe nada. Shhh.' }),
  r({ folio: 'SY-EP-DEMO03', _dia: 0, hora: '20:00', personas: 2, mesa_id: 7, zona: 'cerca-micro', nombre: 'Jesús "Chuy" Arellano', correo: 'chuy.arellano@example.com', telefono: '+1 915 555 0177', ocasion: 'cantar', estado: 'confirmada', corazon_roto: true, source: 'google' }),
  r({ folio: 'SY-EP-DEMO04', _dia: 0, hora: '20:30', personas: 6, mesa_id: 3, zona: 'cerca-micro', nombre: 'Daniela Robles', correo: 'dani.robles@example.com', telefono: '+1 915 555 0118', ocasion: 'divorcio', estado: 'confirmada', corazon_roto: true, source: 'instagram', extras: [{ id: 'botella', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 120, comentarios: 'Firmó ayer. Queremos que se sienta reina.' }),
  r({ folio: 'SY-EP-DEMO05', _dia: 0, hora: '21:00', personas: 4, mesa_id: 11, zona: 'tranquis', nombre: 'Carlos Ochoa', correo: 'carlos.ochoa@example.com', telefono: '+1 915 555 0163', ocasion: 'cantar', estado: 'pendiente', source: 'creador-lalo' }),
  r({ folio: 'SY-EP-DEMO06', _dia: 0, hora: '21:30', personas: 3, mesa_id: 18, zona: 'barra', nombre: 'Andrea Saucedo', correo: 'andrea.saucedo@example.com', telefono: '+52 656 555 0110', ocasion: 'cantar', estado: 'pendiente', corazon_roto: true, source: 'instagram' }),
  r({ folio: 'SY-EP-DEMO07', _dia: 0, hora: '22:00', personas: 12, mesa_id: 8, zona: 'cerca-micro', nombre: 'Luis Fernando Holguín', correo: 'lf.holguin@example.com', telefono: '+1 915 555 0155', ocasion: 'posada', estado: 'confirmada', source: 'google', extras: [{ id: 'mariachi', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 200, comentarios: 'Posada de la oficina, factura a nombre de la empresa.' }),
  // ----- Próximos días -----
  r({ folio: 'SY-EP-DEMO08', _abierto: 1, hora: '19:00', personas: 2, mesa_id: 9, zona: 'tranquis', nombre: 'Paola Chávez', correo: 'paola.chavez@example.com', telefono: '+1 915 555 0124', ocasion: 'cantar', estado: 'confirmada', source: 'instagram' }),
  r({ folio: 'SY-EP-DEMO09', _abierto: 1, hora: '20:30', personas: 6, mesa_id: 4, zona: 'cerca-micro', nombre: 'Ricardo Montes', correo: 'ricardo.montes@example.com', telefono: '+1 915 555 0181', ocasion: 'cumpleanos', estado: 'pendiente', source: 'tiktok', extras: [{ id: 'pastel', cantidad: 1 }], deposito_estado: 'pendiente', monto_deposito: 35 }),
  r({ folio: 'SY-EP-DEMO10', _abierto: 2, hora: '21:00', personas: 10, mesa_id: 14, zona: 'tranquis', nombre: 'Karla Villalobos', correo: 'karla.villalobos@example.com', telefono: '+52 656 555 0137', ocasion: 'despedida', estado: 'confirmada', source: 'instagram', extras: [{ id: 'despedida', cantidad: 1 }, { id: 'botella', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 170 }),
  r({ folio: 'SY-EP-DEMO11', _abierto: 2, hora: '22:00', personas: 4, mesa_id: 1, zona: 'cerca-micro', nombre: 'Brenda Lucero', correo: 'brenda.lucero@example.com', telefono: '+1 915 555 0109', ocasion: 'divorcio', estado: 'confirmada', corazon_roto: true, source: 'creador-lalo' }),
  r({ folio: 'SY-EP-DEMO12', _domingo: true, hora: '10:30', personas: 8, mesa_id: 24, zona: 'terraza', nombre: 'Óscar Meraz', correo: 'oscar.meraz@example.com', telefono: '+1 915 555 0146', ocasion: 'recovery-brunch', estado: 'confirmada', source: 'google' }),
  r({ folio: 'SY-EP-DEMO13', _domingo: true, hora: '12:00', personas: 4, mesa_id: 21, zona: 'terraza', nombre: 'Fernanda Quiñones', correo: 'fer.quinones@example.com', telefono: '+52 656 555 0170', ocasion: 'recovery-brunch', estado: 'pendiente', corazon_roto: true, source: 'instagram' }),
  r({ folio: 'SY-EP-DEMO14', _abierto: 4, hora: '19:30', personas: 2, mesa_id: 10, zona: 'tranquis', nombre: 'Miguel Ángel Durán', correo: 'miguel.duran@example.com', telefono: '+1 915 555 0158', ocasion: 'cantar', estado: 'cancelada', source: 'google' }),
  r({ folio: 'SY-EP-DEMO15', _abierto: 5, hora: '20:00', personas: 6, mesa_id: 22, zona: 'terraza', nombre: 'Ximena Portillo', correo: 'ximena.portillo@example.com', telefono: '+1 915 555 0133', ocasion: 'cumpleanos', estado: 'confirmada', source: 'tiktok', extras: [{ id: 'pastel', cantidad: 1 }, { id: 'mariachi', cantidad: 1 }], deposito_estado: 'pagado', monto_deposito: 185 }),
];

export const turnosSeed = [
  { mesa: 2, nombre: 'Valeria', cancion: 'Hasta que te conocí', artista: 'Juan Gabriel', estado: 'cantando', _hace: 4 },
  { mesa: 5, nombre: 'Mariana y sus damas', cancion: 'Ya lo sé que tú te vas', artista: 'Juan Gabriel', estado: 'en_fila', _hace: 12 },
  { mesa: 7, nombre: 'Chuy', cancion: 'El Rey', artista: 'José Alfredo Jiménez', estado: 'en_fila', _hace: 9 },
  { mesa: 3, nombre: 'Dani', cancion: 'Mátalas', artista: 'Alejandro Fernández', estado: 'en_fila', _hace: 3 },
];

export const dedicatoriasSeed = [
  { mesa: 2, cancion: 'Querida', para: 'Valeria', mensaje: 'Feliz cumple, amiga. Que este año sí te contesten.', anonimo: false, estado: 'en_fila', _hace: 18 },
  { mesa: 3, cancion: 'Se me olvidó otra vez', para: 'El Brayan', mensaje: 'Ya ni me acuerdo de ti. Bueno, poquito.', anonimo: true, estado: 'en_fila', _hace: 14 },
  { mesa: 5, cancion: 'Amor eterno', para: 'La novia', mensaje: 'Para la futura señora. Te vamos a extrañar los viernes.', anonimo: false, estado: 'en_fila', _hace: 8 },
  { mesa: 11, cancion: 'La Puerta Negra', para: 'Mi ex', mensaje: 'Ni aunque me pongan la puerta negra.', anonimo: true, estado: 'cantada', _hace: 40 },
  { mesa: 18, cancion: 'Tu recuerdo y yo', para: 'Todos los de la barra', mensaje: 'Salud por los que no nos supieron querer.', anonimo: false, estado: 'en_fila', _hace: 2 },
];

export const llamadosSeed = [
  { mesa: 5, tipo: 'mesero', estado: 'pendiente', _hace: 2 },
  { mesa: 2, tipo: 'cuenta', estado: 'pendiente', _hace: 7 },
  // Ya atendidos (para el reporte de tiempo promedio). `_atendido`: minutos después de creados.
  { mesa: 3, tipo: 'mesero', estado: 'atendido', _hace: 50, _atendido: 2 },
  { mesa: 8, tipo: 'cuenta', estado: 'atendido', _hace: 40, _atendido: 6 },
  { mesa: 11, tipo: 'mesero', estado: 'atendido', _hace: 25, _atendido: 3 },
  { mesa: 18, tipo: 'ayuda', estado: 'atendido', _hace: 15, _atendido: 4 },
];

export const esperaSeed = [
  { nombre: 'Rocío Galindo', telefono: '+1 915 555 0190', personas: 4, estado: 'esperando', _hace: 22 },
  { nombre: 'Tony Esparza', telefono: '+52 656 555 0128', personas: 2, estado: 'esperando', _hace: 11 },
  { nombre: 'Familia Rentería', telefono: '+1 915 555 0115', personas: 6, estado: 'avisado', _hace: 30 },
];

export const clientesSeed = [
  { nombre: 'Valeria Domínguez', correo: 'valeria.dominguez@example.com', telefono: '+1 915 555 0141', visitas: 6, sellos: 4, _ultima: 9, cumpleanos: '1994-10-12', notas: 'Siempre pide mesa 2. Canta Juanga.', etiquetas: ['frecuente', 'cumpleañera'] },
  { nombre: 'Mariana Treviño', correo: 'mariana.trevino@example.com', telefono: '+52 656 555 0192', visitas: 2, sellos: 2, _ultima: 30, cumpleanos: '1997-03-08', notas: 'Organiza despedidas.', etiquetas: ['grupos'] },
  { nombre: 'Jesús "Chuy" Arellano', correo: 'chuy.arellano@example.com', telefono: '+1 915 555 0177', visitas: 11, sellos: 5, _ultima: 3, cumpleanos: '1989-07-21', notas: 'El rey del micro. Le toca cantarito de la casa.', etiquetas: ['frecuente', 'vip'] },
  { nombre: 'Daniela Robles', correo: 'dani.robles@example.com', telefono: '+1 915 555 0118', visitas: 3, sellos: 3, _ultima: 14, cumpleanos: '1991-12-02', notas: null, etiquetas: ['corazón roto'] },
  { nombre: 'Carlos Ochoa', correo: 'carlos.ochoa@example.com', telefono: '+1 915 555 0163', visitas: 1, sellos: 1, _ultima: 45, cumpleanos: null, notas: 'Llegó por el creador Lalo.', etiquetas: [] },
  { nombre: 'Paola Chávez', correo: 'paola.chavez@example.com', telefono: '+1 915 555 0124', visitas: 4, sellos: 2, _ultima: 7, cumpleanos: '1996-05-19', notas: null, etiquetas: ['brunch'] },
  { nombre: 'Karla Villalobos', correo: 'karla.villalobos@example.com', telefono: '+52 656 555 0137', visitas: 2, sellos: 1, _ultima: 60, cumpleanos: '1993-09-30', notas: 'Viene de Juárez con grupo grande.', etiquetas: ['grupos'] },
  { nombre: 'Brenda Lucero', correo: 'brenda.lucero@example.com', telefono: '+1 915 555 0109', visitas: 5, sellos: 4, _ultima: 5, cumpleanos: '1990-02-14', notas: 'Fiesta de divorcio, segunda vez que celebra aquí.', etiquetas: ['frecuente', 'corazón roto'] },
  { nombre: 'Óscar Meraz', correo: 'oscar.meraz@example.com', telefono: '+1 915 555 0146', visitas: 8, sellos: 3, _ultima: 6, cumpleanos: '1985-11-03', notas: 'Brunch de domingo con la familia.', etiquetas: ['brunch', 'frecuente'] },
  { nombre: 'Ximena Portillo', correo: 'ximena.portillo@example.com', telefono: '+1 915 555 0133', visitas: 1, sellos: 0, _ultima: null, cumpleanos: '2001-10-20', notas: null, etiquetas: ['nueva'] },
];

export const resenasSeed = [
  { folio: 'SY-EP-DEMO11', estrellas: 5, comentario: 'La mejor fiesta de divorcio. Cantamos hasta quedarnos sin voz.', _hace: 60 * 24 * 3 },
  { folio: 'SY-EP-DEMO08', estrellas: 5, comentario: 'El cantarito y el ambiente, de diez.', _hace: 60 * 24 * 5 },
  { folio: 'SY-EP-DEMO12', estrellas: 4, comentario: 'Muy buen brunch, la música un poco alta para la abuela.', _hace: 60 * 24 * 6 },
  { folio: 'SY-EP-DEMO05', estrellas: 2, comentario: 'Tardaron mucho en traer la cuenta.', _hace: 60 * 24 * 8 },
];

export const fotosSeed = [
  { mesa: 2, url: '/assets/fotos/ig_singing.jpg', estado: 'aprobada', _hace: 25 },
  { mesa: 5, url: '/assets/fotos/ig_green.jpg', estado: 'aprobada', _hace: 15 },
  { mesa: 11, url: '/assets/fotos/jarrito.jpg', estado: 'pendiente', _hace: 3 },
];
