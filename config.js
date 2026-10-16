/* Configuración PÚBLICA del sitio. No poner acá tokens, claves ni datos de clientas. */
window.CHHARI = {
  // Dirección de la aplicación web del servidor (Google Apps Script). Ver SERVIDOR.md.
  api: "https://script.google.com/macros/s/AKfycbxEvl6oq2AsbyAQpu0DCgHqF6vUpP-PPVDQMOvUibXmo1Tctjl7YSzhQXNFZTivDXGcHA/exec",
  whatsapp: "5493517593713",
  sena: 10000,
  duracionMinFallback: 120,
  salon: {
    direccion: "LAS PLAYAS 1717", barrio: "VILLA CABRERA", instagram: "@Chharichhula",
    mapa: "https://www.google.com/maps/search/?api=1&query=Las+Playas+1717+Villa+Cabrera+C%C3%B3rdoba"
  },
  // Respaldo visual si el servidor no responde. El valor, la duración y la agenda reales los define el servidor.
  servicios: [
    { id: "semi", nombre: "Esmaltado semipermanente", valor: "$20.000", tiempo: "1:30 hs", min: 90 },
    { id: "capnivel", nombre: "Capping nivelador", valor: "$25.000", tiempo: "2:00 hs", min: 120 },
    { id: "cappoly", nombre: "Capping Poligel", valor: "$30.000", tiempo: "2:30 hs", min: 150 },
    { id: "soft", nombre: "Soft Gel", valor: "desde $35.000", tiempo: "3:00 hs", min: 180 },
    { id: "rusa", nombre: "Manicura rusa", valor: "$18.000", tiempo: "1:00 hs", min: 60 }
  ],
  politica: [
    "Los turnos se reservan con una seña de $10.000. Sin seña acreditada el turno no queda confirmado.",
    "La seña se descuenta del valor total de los servicios realizados y no tiene devolución de dinero.",
    "Podés cancelar desde tu enlace privado hasta 72 horas antes (inclusive). El horario se libera y la seña acreditada queda a tu favor para reprogramar.",
    "Entre 72 y 24 horas antes, contactá a Chhari para reprogramar según su disponibilidad.",
    "La seña se conserva si avisás con al menos 24 horas de anticipación y reprogramás en un horario disponible de la agenda.",
    "Si no asistís a la cita, la seña se pierde.",
    "Los pagos se abonan antes de retirarse del salón. No se trabaja con saldos pendientes."
  ],
  tenerEnCuenta: [
    "Enviar una foto del estado actual de cómo vienen tus uñas.",
    "Enviar una foto de referencia del diseño que vamos a realizar. Hay diseños que requieren más tiempo y esto permite organizar la agenda con precisión para vos y para la próxima clienta."
  ],
  reglas: [
    "Ser puntuales a su cita pactada (tolerancia 15’).",
    "Asistir con sus uñas limpias y cepilladas, sin restos de comida o suciedad por debajo y por arriba de sus uñas.",
    "No aplicarse cremas en las manos antes de la cita.",
    "No asistir con esmaltes tradicionales.",
    "Avisar previamente si vienen con un servicio hecho en otro salón.",
    "Asistir a su cita sin acompañantes.",
    "Salón no apto para recibir niñes."
  ]
};
