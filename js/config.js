/* ==========================================================================
   CONFIGURACIÓN EDITABLE DE LA SORPRESA
   Todo el texto, las fotos y la lista de canciones vive aquí.
   ========================================================================== */

export const CONFIG = {
  name: 'Maricielo',
  shortName: 'Mari',
  from: 'Bryan',
  // Fecha del cumpleaños (año, mes 1-12, día)
  birthday: { year: 2026, month: 10, day: 26 },

  photos: [
    {
      src: 'assets/media/foto-cerro.jpg',
      caption: 'Explorando cerros juntos 🌿',
      note: 'Aventura, sombrero y cero miedo.',
    },
    {
      src: 'assets/media/foto-juntos.jpg',
      caption: 'Las mejores charlas, con comida 🍗',
      note: 'Siempre hay tiempo para reír un rato más.',
    },
    {
      src: 'assets/media/foto-nina-1.jpg',
      caption: 'Desde chiquita con vocación ✨',
      note: 'Toda seria y con toda la actitud desde pequeñita.',
    },
    {
      src: 'assets/media/foto-nina-2.jpg',
      caption: 'Tarde de piscina VIP 😂🧡',
      note: 'Las fotos raras y épicas que nunca pueden faltar.',
    },
  ],

  video: {
    src: 'assets/media/video-casero.mp4',
    poster: 'assets/media/video-poster.jpg',
    title: 'Lo que realmente hablamos 😂',
  },

  // Carta (cada elemento es un párrafo)
  letter: [
    'Hoy es tu día y quisiera regalarte algo superdistinto. Sé que estamos muy lejos, pero esta es mi creación: un cuartito lleno de luces, casetes y recuerdos hecho solo para ti.',
    'Gracias por las risas, por las aventuras en los cerros, en los parques, los vinos, las conversaciones más locas que nadie entendería, las del video, por ejemplo, esas fotos raras, y por ser una prima tan especial.',
    'Que este año nuevo te traiga muchísimos motivos para sonreír, sueños que cumplir y canciones que se queden pegadas al corazón. Y sobre todo, que sigas estudiando, que es lo principal en tu vida y lo estás haciendo muy bien. Ya vas ya al 70% de tu avance, falta poquito.',
    'Pon un casete, sube el volumen y disfruta. Este día es solo tuyo.',
    'Feliz cumpleaños, Maricielo. 🎂',
  ],
  letterSign: ['Con muchísimo cariño,', 'tu primo Bryan.'],

  coupon: {
    kicker: 'VALE ESPECIAL · Nº 026',
    title: 'Vale por una aventura',
    lines: [
      'Válido para: Maricielo',
      'Incluye: un cerro o parque por explorar + vino y comida rica',
      'Por ese 70% de avance en tus estudios (¡ya falta poquito!)',
      'Vence: nunca · Canjeable apenas nos veamos',
    ],
  },

  // Noticias del canal 03 de la TV
  news: [
    'ÚLTIMA HORA: hoy cumple años Maricielo',
    'ORGULLO FAMILIAR: Maricielo ya alcanza el 70% de avance en sus estudios',
    'Servicio meteorológico: cielo despejado y 100% de probabilidad de abrazos',
    'Expertos confirman que es la mejor prima del universo conocido',
    'Se recomienda comer pastel y brindar con vino sin culpa durante todo el día',
  ],

  /* ------------------------------------------------------------------------
     CASETES
     ------------------------------------------------------------------------ */
  songs: [
    {
      title: 'Las Mañanitas',
      artist: 'Vicente Fernández',
      src: 'music/01-las-mananitas.mp3',
      label: '#f6c453',
      shell: 'smoke',
    },
    {
      title: 'En Tu Día',
      artist: 'Pedro Infante',
      src: 'music/02-en-tu-dia.mp3',
      label: '#f28aa5',
      shell: 'clear',
    },
    {
      title: 'Santuyuqmi',
      artist: 'Eliza Garcia',
      src: 'music/03-santuyuqmi.mp3',
      label: '#7fd1c7',
      shell: 'white',
    },
    {
      title: 'Serenata Condemayta',
      artist: 'Condemayta de Acomayo',
      src: 'music/04-serenata-condemayta.mp3',
      label: '#b9a3f0',
      shell: 'smoke',
    },
    {
      title: 'Felicidades',
      artist: 'Mariachi Azteca',
      src: 'music/05-felicidades.mp3',
      label: '#f7835a',
      shell: 'clear',
    },
  ],
};
