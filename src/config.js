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
    tiktok: 'https://www.tiktok.com/@sinyolandaelpaso', // TODO cliente: confirmar usuario
    opentable: 'https://www.opentable.com/r/sin-yolanda-el-paso',
    mapa: 'https://www.google.com/maps/search/?api=1&query=Sin+Yolanda+340+Vin+Rambla+Dr+El+Paso+TX',
    comoLlegar: 'https://www.google.com/maps/dir/?api=1&destination=340+Vin+Rambla+Dr+El+Paso+TX',
    mapaEmbed: 'https://www.google.com/maps?q=Sin+Yolanda,+340+Vin+Rambla+Dr,+El+Paso,+TX&output=embed',
    purpleRoots: 'https://purpleroots.agency', // TODO: confirmar URL de la agencia
  },

  analytics: {
    ga4: '', // G-XXXXXXXXXX
    metaPixel: '', // 000000000000000
  },

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
