/**
 * Chhari Chhula · servidor de reservas (Google Apps Script)
 * CONFIGURACIÓN PÚBLICA. Acá NO van secretos: tokens y claves viven en
 * "Propiedades de la secuencia de comandos" (ver SERVIDOR.md).
 */
var CFG = {
  SITIO: "https://chharichhula.github.io/chharichhula-reservas/",
  TZ_MIN: -180,                 // Argentina: UTC-3 todo el año (sin horario de verano)
  SENA: 10000,
  MONEDA: "ARS",
  ANTICIPACION_H: 12,           // no se puede reservar con menos de 12 h de anticipación
  MESES_ADELANTE: 2,            // mes actual + 2
  CANCELACION_H: 72,            // cancelar online hasta 72 h antes (inclusive)
  AVISO_H: 24,                  // política: aviso de 24 h para reprogramar con Chari
  HOLD_TRANSFER_H: 12,          // horas que se reserva el lugar esperando la transferencia
  HOLD_MP_MIN: 30,              // minutos que dura el checkout de Mercado Pago
  HOLD_MP_EN_PROCESO_H: 24,     // si Mercado Pago informa "en proceso", se espera hasta 24 h
  MAX_PENDIENTES_POR_TEL: 2,
  WHATSAPP: "5493517593713",
  SALON: {
    direccion: "LAS PLAYAS 1717", barrio: "VILLA CABRERA", instagram: "@Chharichhula",
    alias: "virgo.30", titular: "Carolina Micaela Marengo", celular: "3517593713",
    mapa: "https://www.google.com/maps/search/?api=1&query=Las+Playas+1717+Villa+Cabrera+C%C3%B3rdoba"
  },
  HORARIOS: {
    0: [],
    1: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    2: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    3: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    4: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    5: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    6: ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"]
  },
  CIERRE: { 0: null, 1: "18:00", 2: "18:00", 3: "18:00", 4: "18:00", 5: "18:00", 6: "17:00" }
};

/** Catálogo oficial (el navegador solo manda el id; duración y valor salen de acá). */
var SERVICIOS = [
  { id: "semi", n: "Esmaltado semipermanente", v: "$20.000", t: "1:30 hs", min: 90,
    d: "Consiste en aplicar color y diseño sobre tu uña natural. Ideal si querés mantener tus uñas prolijas y con brillo." },
  { id: "capnivel", n: "Capping nivelador", v: "$25.000", t: "2:00 hs", min: 120,
    d: "Consiste en reforzar la uña natural con una capa fina de gel para darle más resistencia, y luego se aplica el esmaltado semipermanente. Perfecto si tus uñas son frágiles o se quiebran fácilmente. Ideal para uñas corta a medias." },
  { id: "cappoly", n: "Capping Poligel", v: "$30.000", t: "2:30 hs", min: 150,
    d: "Consiste en aplicar una capa fina de Polygel (gel más rígido) sobre la uña natural para reforzarla, emparejar la superficie y darle mayor durabilidad. Ideal para uñas naturales largas." },
  { id: "soft", n: "Soft Gel", v: "desde $35.000", t: "3:00 hs", min: 180,
    d: "Extensión de gel preformadas que se adhieren a la uña natural, logrando un largo y una forma perfectos de manera rápida y cómoda. Se finalizan con esmaltado semipermanente. Ideal si querés alargar tus uñas de inmediato.",
    x: "Largo 1 y 2: $35.000 · Largo 3 y 4: $38.000 · Largo XXL: $45.000" },
  { id: "rusa", n: "Manicura rusa", v: "$18.000", t: "1:00 hs", min: 60,
    d: "Es una técnica de limpieza profunda y detallada del contorno de la uña y cutículas, realizada con torno. Deja un acabado impecable sin la necesidad de aplicarse Semipermanente o Capping." }
];

var REMOCIONES = [
  "Remoción completa de trabajos hechos en otro salón: $7000",
  "Remoción completa de Soft Gel o Capping (hechos en mi salón): $5000",
  "Remoción completa de semipermanente (hechos en mi salón): $3000",
  "Reconstrucción por cada uña: $1000",
  "Remoción Soft Gel / Capping + Manicura rusa: $22.000",
  "Remoción semipermanente + Manicura rusa: $20.000"
];

var EFECTOS = [
  "Efecto espejado: $500", "Efecto holográfico: $500", "Efecto aurora: $500", "Efecto aura: $500",
  "Efecto blooming: $400", "Stras brillos 5x uña: $700", "Relieve: $600", "Relieve 3D: $900",
  "Baby boomer / color: $400", "Baby glitter: $600", "Encapsulado: $1000", "Nail art y french: $300"
];

var RESERVA = [
  "Los turnos se reservan con una seña de $10.000. Sin seña el turno no queda confirmado.",
  "La seña se descuenta del valor total de los servicios realizados.",
  "La seña no tiene devolución. Si no llegás a la cita se pierde.",
  "La seña se mantiene con el previo aviso de 24 hs antes de la cita pactada, y reprogramando una cita nueva, organizada a los tiempos disponibles de la agenda.",
  "Podés cancelar desde tu enlace privado hasta 72 hs antes: el horario se libera y la seña acreditada queda a tu favor para reprogramar.",
  "Los pagos se abonan antes de retirarse del salón.",
  "No trabajo con saldos pendientes."
];

var TENER_EN_CUENTA = [
  "Enviar una foto del estado actual de cómo vienen tus uñas.",
  "Enviar una foto de referencia del diseño que vamos a realizar. Ya que hay diseños que requieren más tiempo y esto me permite organizar la agenda con precisión para vos y mi próxima clienta."
];

var REGLAS = [
  "Ser puntuales a su cita pactada (tolerancia 15’).",
  "Asistir con sus uñas limpias y cepilladas sin resto de comida o suciedad por debajo y por arriba de sus uñas.",
  "No aplicarse cremas en las manos antes de la cita.",
  "No asistir con esmaltes tradicionales.",
  "Avisar previamente si vienen con un servicio hecho en otro salón.",
  "Asistir a su cita sin acompañantes.",
  "Salón no apto para recibir niñes."
];

var ESTADO = { PEND: "Pendiente", CONF: "Confirmada", CANC: "Cancelada", VENC: "Vencida", REV: "Revisión", NOASIST: "No asistió" };
var PAGO = { SIN: "Sin pago", PEND: "Pendiente", ACR: "Acreditado", RECH: "Rechazado" };
var MEDIO = { TRANSF: "transferencia", MP: "mercadopago", CRED: "credito" };
var CRED = { DISP: "Disponible", APLIC: "Aplicado", REVERT: "Revertido" };
