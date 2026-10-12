// Configuración de la sucursal. Todo lo que puede cambiar sin tocar el diseño vive aquí.
// Se usa en el navegador y también al construir el HTML (vite.config.js), así que
// no importes nada del DOM en este archivo.

export const CONFIG = {
  sitioUrl: 'https://sinyolandaelpaso.com', // TODO cliente: confirmar dominio

  // Backend de reservas (Fase 3). Pega aquí la URL del Web App de Apps Script.
  appsScriptUrl: '',

  // Mientras sea true, se ven las etiquetas "Por confirmar" y "Propuesta"
  // en los eventos y cócteles de ejemplo. Ponlo en false al publicar.
  borrador: true,

  zonaHoraria: 'America/Denver',

  direccion: {
    calle: '340 Vin Rambla Dr',
    ciudad: 'El Paso',
    estado: 'TX',
    cp: '79912', // TODO cliente: confirmar código postal
    pais: 'US',
    geo: null, // TODO cliente: coordenadas exactas { lat, lng } para el JSON-LD
  },

  telefono: '', // TODO cliente: teléfono de la sucursal, formato +1 915 000 0000
  whatsapp: '', // TODO cliente: solo dígitos con lada, ej. 19150000000

  links: {
    instagram: 'https://www.instagram.com/sinyolandaelpaso/',
    instagramUsuario: '@sinyolandaelpaso',
    tiktok: 'https://www.tiktok.com/@sinyolandaelpaso', // Por confirmar
    opentable: 'https://www.opentable.com/r/sin-yolanda-el-paso',
    mapa: 'https://www.google.com/maps/search/?api=1&query=Sin+Yolanda+340+Vin+Rambla+Dr+El+Paso+TX',
    comoLlegar: 'https://www.google.com/maps/dir/?api=1&destination=340+Vin+Rambla+Dr+El+Paso+TX',
    mapaEmbed: 'https://www.google.com/maps?q=Sin+Yolanda,+340+Vin+Rambla+Dr,+El+Paso,+TX&output=embed',
    purpleRoots: 'https://purpleroots.agency', // Por confirmar
  },

  analytics: {
    ga4: '', // G-XXXXXXXXXX
    metaPixel: '', // 000000000000000
  },

  // ---------- Plataforma ----------

  ocasiones: [
    { id: 'cantar', es: 'Solo vengo a cantar', en: 'Just here to sing' },
    { id: 'cumpleanos', es: 'Cumpleaños', en: 'Birthday' },
    { id: 'despedida', es: 'Despedida de soltera', en: 'Bachelorette' },
    { id: 'divorcio', es: 'Fiesta de divorcio', en: 'Divorce party' },
    { id: 'posada', es: 'Posada de empresa', en: 'Company posada' },
    { id: 'recovery-brunch', es: 'Recovery Brunch', en: 'Recovery Brunch' },
  ],

  // Extras opcionales. Precios en USD, POR CONFIRMAR con el cliente.
  extras: [
    { id: 'pastel', nombre: 'Pastel de cumpleaños con vela', detalle: 'Llega a la mesa con su vela y Las Mañanitas.', precio: 35, icono: 'corazon' },
    { id: 'despedida', nombre: 'Decoración de despedida', detalle: 'Banda de "Futura señora" y corona para la novia.', precio: 50, icono: 'sombrero' },
    { id: 'botella', nombre: 'Botella reservada', detalle: 'Tequila o mezcal esperándolos en la mesa.', precio: 120, icono: 'cantarito' },
    { id: 'mariachi', nombre: 'Que el mariachi te cante', detalle: 'Una canción en vivo dedicada a tu mesa.', precio: 150, icono: 'micro' },
  ],

  // Depósito: se cobra solo si hay paquete, evento con boleto o extras.
  deposito: {
    paquetes: ['despedida', 'divorcio', 'posada'], // ocasiones que son paquete
    montoPaquete: 50, // POR CONFIRMAR
  },

  // Calienta la garganta. Placeholder hasta tener la playlist oficial.
  playlist: {
    url: 'https://open.spotify.com/', // TODO cliente: link de la playlist oficial
    top10: [
      ['Querida', 'Juan Gabriel'],
      ['El Rey', 'José Alfredo Jiménez'],
      ['La Puerta Negra', 'Los Tigres del Norte'],
      ['Mátalas', 'Alejandro Fernández'],
      ['Hasta que te conocí', 'Juan Gabriel'],
      ['Tu recuerdo y yo', 'José Alfredo Jiménez'],
      ['Paloma Negra', 'Lola Beltrán'],
      ['Si nos dejan', 'Luis Miguel'],
      ['Amor eterno', 'Rocío Dúrcal'],
      ['Me gustas mucho', 'Rocío Dúrcal'],
    ],
  },

  // Qué pedir en tu noche (nombres de menu.json).
  recomendaciones: ['Cantaritos', 'Quesabirria', 'El Querida'],

  // Reseñas: con 5 estrellas se manda aquí. TODO cliente: link real de Google.
  resenaGoogle: 'https://search.google.com/local/writereview?placeid=TODO',

  estacionamiento: 'Estacionamiento gratis en la plaza, frente a la cantina.', // Por confirmar

  // Horario por día de la semana (0 = domingo). Formato 24 h.
  // Si `cierra` es menor que `abre`, el cierre es de madrugada del día siguiente.
  horario: {
    0: { abre: '10:00', cierra: '21:00' },
    1: null,
    2: null,
    3: { abre: '16:00', cierra: '21:00' },
    4: { abre: '16:00', cierra: '02:00' },
    5: { abre: '16:00', cierra: '02:00' },
    6: { abre: '10:00', cierra: '02:00' },
  },
};
