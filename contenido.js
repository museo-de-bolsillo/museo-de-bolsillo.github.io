// Lo que el grupo puede ajustar sin tocar el motor: textos de las salas y zonas táctiles.

export const SALAS = {
  tarjeta: {
    nombre: "Museo de Bolsillo",
    autora: "La tarjeta del Kit de Bienvenida",
    obra: "La tarjeta guarda una moneda que tal vez mañana ya no circule. Lo cotidiano de hoy será pieza de museo.",
    leccion: "Una tarjeta de crédito es una herramienta: bien usada te da beneficios e historial; mal usada, deudas.",
    dato: "Solo el 23,9 % de los adultos en Colombia tiene tarjeta de crédito.",
    fuente: "SFC y Banca de las Oportunidades, Reporte de Inclusión Financiera 2025",
  },
  sie: {
    nombre: "Sala 1 · Diosa Sie",
    autora: "Reinterpretación de Santiago",
    obra: "Sie, diosa muisca del agua, representa la riqueza antigua. Para Ledania es la riqueza que vuelve a las personas, y sus dioses sin género hablan de igualdad.",
    leccion: "El cupo de tu tarjeta no es tu sueldo: es dinero prestado. Haz un presupuesto y usa solo una parte del cupo.",
    dato: "En 2025, el 38,4 % de los hombres y el 34,7 % de las mujeres tenía acceso al crédito.",
    fuente: "SFC y Banca de las Oportunidades, Reporte de Inclusión Financiera 2025",
  },
  buho: {
    nombre: "Sala 2 · Búho",
    autora: "Reinterpretación de Victor",
    obra: "El búho de Minerva alza el vuelo en el crepúsculo: la sabiduría llega al final del día.",
    leccion: "Que tu sabiduría llegue antes de firmar: revisa la tasa de interés, la cuota de manejo y tu extracto cada mes.",
    dato: "Solo el 5,6 % de los adultos responde bien una pregunta de interés simple y compuesto.",
    fuente: "Banca de las Oportunidades, Encuesta de capacidades financieras 2026",
  },
  atardecer: {
    nombre: "Sala 3 · Atardecer",
    autora: "Reinterpretación de Daniela",
    obra: "El ocaso del sistema financiero tradicional y el nacimiento de servicios más ágiles. El sol-moneda se derrite y su oro vuelve a la laguna.",
    leccion: "Cada mes cae el corte. Paga el total antes de la fecha límite: si pagas solo el mínimo, el resto genera intereses.",
    dato: "El 31 % de los consumidores espera no poder pagar al menos una de sus deudas.",
    fuente: "TransUnion, Consumer Pulse 2026, según Portafolio",
    escena: "paisaje",
    boton: "Entrar al paisaje",
  },
  quimbaya: {
    nombre: "Sala 4 · Figura Quimbaya",
    autora: "Reinterpretación de Stefania",
    obra: "Los símbolos Quimbaya y la moneda que la tarjeta conserva: el oro de nuestros ancestros y el valor que se guarda.",
    leccion: "Los avances en efectivo cobran intereses altos. Usa la tarjeta para comprar, no para sacar plata.",
    dato: "La tasa promedio de los avances con tarjeta fue 22,93 % E.A. en junio de 2026.",
    fuente: "La República, con datos de la SFC",
  },
  flores: {
    nombre: "Sala 5 · Flores",
    autora: "Reinterpretación de Kassandra",
    obra: "La orquídea, flor emblema de Colombia, y la diversidad de personas que tendrán acceso al crédito.",
    leccion: "Pagar a tiempo hace florecer tu historial crediticio y te abre puertas para estudiar o tener vivienda.",
    dato: "La mora de las tarjetas de crédito bajó a 4,0 % en el segundo trimestre de 2026: usarla bien es posible.",
    fuente: "TransUnion Colombia, comunicado del 19 de agosto de 2026",
    escena: "orquidea",
    boton: "Ver la orquídea",
  },
  final: {
    nombre: "¡Recorriste el museo!",
    autora: "Museo de Bolsillo",
    obra: "Viste las seis salas: la tarjeta, Sie, el búho, el atardecer, la figura Quimbaya y las flores.",
    leccion: "Usa solo una parte del cupo, lee tu extracto, paga el total antes de la fecha límite, evita los avances en efectivo y cuida tu historial. Así la tarjeta trabaja para ti.",
    dato: "Guarda tu tarjeta: es un museo que cabe en el bolsillo.",
    fuente: "Kassandra, Santiago, Stefania, Victor y Daniela · Proyecto de Diseño III, UNAD",
  },
};

// Círculos dorados que invitan a tocar cada sala (en píxeles de la composición).
// La sala de la tarjeta lleva su círculo sobre la tarjeta que flota.
export const PINES = [
  { sala: "sie", n: "1", texto: "Sie", x: 470, y: 330 },
  { sala: "buho", n: "2", texto: "Búho", x: 225, y: 330 },
  { sala: "atardecer", n: "3", texto: "Atardecer", x: 655, y: 175 },
  { sala: "quimbaya", n: "4", texto: "Quimbaya", x: 505, y: 760 },
  { sala: "flores", n: "5", texto: "Flores", x: 115, y: 380 },
];

// Zonas táctiles por escena, en píxeles de cada imagen. Se revisan en orden: gana la primera.
//   rect: x0, y0, x1, y1 · elipse: cx, cy, rx, ry (con límites opcionales minX / maxX)
export const ZONAS = {
  comp: [
    { sala: "tarjeta", rect: [271, 869, 541, 1022] },
    { sala: "quimbaya", elipse: [505, 730, 75, 160], minX: 420 },
    { sala: "flores", elipse: [300, 140, 75, 75] },
    { sala: "flores", elipse: [125, 385, 70, 70] },
    { sala: "flores", elipse: [60, 470, 50, 50] },
    { sala: "flores", elipse: [140, 630, 75, 75] },
    { sala: "flores", elipse: [265, 740, 75, 75] },
    { sala: "sie", elipse: [500, 470, 110, 220], minX: 405 },
    { sala: "buho", elipse: [290, 470, 135, 310], maxX: 405 },
    { sala: "atardecer", elipse: [650, 400, 170, 320], minX: 560 },
  ],
  paisaje: [
    { sala: "sie", elipse: [500, 730, 175, 55] },
    { sala: "flores", elipse: [105, 930, 110, 110] },
    { sala: "flores", elipse: [750, 950, 70, 90] },
    { sala: "atardecer", rect: [0, 0, 810, 1024] },
  ],
  orquidea: [
    { sala: "flores", rect: [0, 0, 810, 1024] },
  ],
};
