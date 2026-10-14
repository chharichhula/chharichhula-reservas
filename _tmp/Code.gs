/**
 * Chhari Chhula · Reservas
 * Guarda cada reserva en la planilla "Chhari · Clientas y turnos" y envía a la clienta
 * un mail con el estilo de Chhari (copia oculta para Chari).
 */

var SHEET_ID = "1MeZighioCB57TN3viINQvwhEzWOSAuKh_fisfOpYCeY";
var HOJA_TURNOS = "Turnos";
var HOJA_CLIENTAS = "Clientas";
var ESTADOS = ["Enviado", "En espera", "Cancelado"];   // etiquetas de la columna "Mensaje de confirmación"
var COL_ESTADO = 11;
var IMG = "https://chharichhula.github.io/chharichhula-reservas/email/";

var SALON = {
  direccion: "LAS PLAYAS 1717",
  barrio: "VILLA CABRERA",
  instagram: "@Chharichhula",
  alias: "virgo.30",
  titular: "Carolina Micaela Marengo",
  celular: "3517593713"
};

var SERVICIOS = [
  { n: "Esmaltado semipermanente", v: "$20.000", t: "1:30 hs",
    d: "Consiste en aplicar color y diseño sobre tu uña natural. Ideal si querés mantener tus uñas prolijas y con brillo." },
  { n: "Capping nivelador", v: "$25.000", t: "2:00 hs",
    d: "Consiste en reforzar la uña natural con una capa fina de gel para darle más resistencia, y luego se aplica el esmaltado semipermanente. Perfecto si tus uñas son frágiles o se quiebran fácilmente. Ideal para uñas corta a medias." },
  { n: "Capping Poligel", v: "$30.000", t: "2:30 hs",
    d: "Consiste en aplicar una capa fina de Polygel (gel más rígido) sobre la uña natural para reforzarla, emparejar la superficie y darle mayor durabilidad. Ideal para uñas naturales largas." },
  { n: "Soft Gel", v: "desde $35.000", t: "3:00 hs",
    d: "Extensión de gel preformadas que se adhieren a la uña natural, logrando un largo y una forma perfectos de manera rápida y cómoda. Se finalizan con esmaltado semipermanente. Ideal si querés alargar tus uñas de inmediato.",
    x: "Largo 1 y 2: $35.000 · Largo 3 y 4: $38.000 · Largo XXL: $45.000" },
  { n: "Manicura rusa", v: "$18.000", t: "1:00 hs",
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

/* ---------------- recepción de reservas ---------------- */

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);

    var turnos = hoja_(ss, HOJA_TURNOS, [
      "Creado", "Nombre", "Apellido", "WhatsApp", "Servicio", "Valor", "Fecha", "Hora", "Seña", "Estado",
      "Mensaje de confirmación", "Enviar confirmación"
    ]);
    var link = "https://wa.me/" + d.telWa + "?text=" + encodeURIComponent(d.mensajeConfirmacion || "");
    turnos.appendRow([
      d.creado, d.nombre, d.apellido, d.tel, d.servicio, d.valor, d.fecha, "'" + d.hora, d.sena, "Pendiente de seña",
      "En espera", '=HYPERLINK("' + link + '";"Enviar por WhatsApp")'
    ]);
    formatoFila_(turnos, turnos.getLastRow());

    var cl = hoja_(ss, HOJA_CLIENTAS, [
      "Nombre", "Apellido", "WhatsApp", "Mail", "Cumpleaños", "Acepta novedades", "Turnos", "Último turno", "Alta"
    ]);
    var fila = buscar_(cl, 3, d.tel);
    if (fila) {
      var n = Number(cl.getRange(fila, 7).getValue()) || 0;
      cl.getRange(fila, 1, 1, 8).setValues([[
        d.nombre, d.apellido, d.tel, d.mail, d.cumple, d.consent ? "Sí" : "No", n + 1, d.fecha + " " + d.hora
      ]]);
    } else {
      cl.appendRow([d.nombre, d.apellido, d.tel, d.mail, d.cumple, d.consent ? "Sí" : "No", 1, d.fecha + " " + d.hora, d.creado]);
    }

    var mailOk = enviarMail_(d);
    return json_({ ok: true, mail: mailOk });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, servicio: "Chhari Chhula · reservas" });
}

/** Ejecutala una vez: ordena el formato, agrega el menú Enviado / En espera / Cancelado y los colores. */
function arreglarFormato() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var t = ss.getSheetByName(HOJA_TURNOS);
  if (!t) return;
  if (t.getLastRow() > 1) {
    var r = t.getRange(2, 1, t.getLastRow() - 1, 12);
    r.setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    t.setRowHeights(2, t.getLastRow() - 1, 24);
    t.getRange(2, 8, t.getLastRow() - 1, 1).setNumberFormat("@");
    // las filas viejas guardaban el texto del mensaje: pasan a "En espera"
    var rango = t.getRange(2, COL_ESTADO, t.getLastRow() - 1, 1);
    var vals = rango.getValues().map(function (f) {
      return [ESTADOS.indexOf(String(f[0])) >= 0 ? f[0] : "En espera"];
    });
    rango.setValues(vals);
  }
  estadosFormato_(t);
}

/** Menú desplegable y colores de la columna de estado (filas 2 a 1000). */
function estadosFormato_(hoja) {
  var rango = hoja.getRange(2, COL_ESTADO, 999, 1);
  rango.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build()
  );
  rango.setFontWeight("bold").setHorizontalAlignment("center");
  var colores = { "Enviado": ["#D9F2E3", "#1B6B3A"], "En espera": ["#FFF1CC", "#8A5A00"], "Cancelado": ["#FAD4D8", "#A12A3C"] };
  var reglas = ESTADOS.map(function (e) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(e).setBackground(colores[e][0]).setFontColor(colores[e][1]).setRanges([rango]).build();
  });
  hoja.setConditionalFormatRules(reglas);
  hoja.setColumnWidth(COL_ESTADO, 130);
}

function formatoFila_(hoja, fila) {
  hoja.getRange(fila, 1, 1, 12).setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  hoja.setRowHeight(fila, 24);
}

/* ---------------- mail ---------------- */

function enviarMail_(d) {
  if (!d.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.mail)) return false;
  try {
    var yo = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({
      to: d.mail,
      bcc: yo,
      replyTo: yo,
      subject: "Tu turno en Chhari Chhula · " + diaCorto_(d.fecha) + " a las " + horaCorta_(d.hora),
      body: textoMail_(d),
      htmlBody: htmlMail_(d),
      name: "Chhari Chhula"
    });
    return true;
  } catch (err) {
    return false;
  }
}

function esc_(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function diaCorto_(f) {
  var p = String(f).split("-");
  var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  var dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return dias[dt.getDay()] + " " + Number(p[2]) + "/" + Number(p[1]);
}
function horaCorta_(h) {
  var p = String(h).split(":");
  return p[1] === "00" ? Number(p[0]) + "hs" : Number(p[0]) + ":" + p[1] + "hs";
}

function textoMail_(d) {
  var L = [];
  L.push("Hola " + d.nombre + ",");
  L.push("");
  L.push("Gracias por reservar tu turno en Chhari Chhula, el hada de las uñas.");
  L.push("");
  L.push("TU TURNO");
  L.push("Servicio: " + d.servicio + " (" + d.valor + ")");
  L.push("Día: " + diaCorto_(d.fecha));
  L.push("Hora: " + horaCorta_(d.hora));
  L.push("Seña: $10.000");
  L.push("");
  L.push("Tu turno queda confirmado cuando se acredita la seña. Después Chari te escribe por WhatsApp.");
  L.push("");
  L.push("DATOS DE TRANSFERENCIA");
  L.push("Alias: " + SALON.alias);
  L.push("Titular: " + SALON.titular);
  L.push("Celular: " + SALON.celular + " (enviar comprobante)");
  L.push("");
  L.push("RESERVA, CONFIRMACIÓN Y CANCELACIONES");
  RESERVA.forEach(function (x) { L.push("- " + x); });
  L.push("");
  L.push("A TENER EN CUENTA");
  TENER_EN_CUENTA.forEach(function (x) { L.push("- " + x); });
  L.push("");
  L.push("DÓNDE TE ESPERO");
  L.push(SALON.direccion + " · Barrio " + SALON.barrio);
  REGLAS.forEach(function (x) { L.push("- " + x); });
  L.push("");
  L.push("SERVICIOS, VALORES Y TIEMPOS");
  L.push("Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).");
  SERVICIOS.forEach(function (s) {
    L.push("");
    L.push(s.n + " · " + s.v + " · " + s.t);
    L.push(s.d);
    if (s.x) L.push(s.x);
  });
  L.push("");
  L.push("VALORES EXTRAS");
  REMOCIONES.forEach(function (x) { L.push("- " + x); });
  EFECTOS.forEach(function (x) { L.push("- " + x); });
  L.push("");
  L.push("Gracias, te espero.");
  L.push(SALON.instagram);
  return L.join("\n");
}

var C_VERDE = "#1B4D3A", C_ROSA = "#EE5D93", C_ROSA_CLARO = "#F8D5E1", C_PALE = "#FFE9F1", C_CREMA = "#FFF7EE", C_TINTA = "#2A2320";

function titulo_(t) {
  return "<div style='font-family:Georgia,\"Times New Roman\",serif;font-size:21px;color:" + C_VERDE + ";font-weight:bold;margin:0 0 8px'>" + t + "</div>";
}
function lista_(arr) {
  return "<ul style='margin:0;padding-left:20px;font-size:14px;line-height:1.55;color:" + C_TINTA + "'>" +
    arr.map(function (x) { return "<li style='margin-bottom:6px'>" + esc_(x) + "</li>"; }).join("") + "</ul>";
}
/* sección con una imagen decorativa a un costado */
function seccion_(contenido, imgFile, imgW, lado) {
  var img = "<img src='" + IMG + imgFile + "' width='" + imgW + "' alt='' style='display:block;width:" + imgW + "px;max-width:100%;height:auto;border:0'>";
  var t = "<td valign='top' style='padding:0'>" + contenido + "</td>";
  var i = "<td valign='middle' width='" + (imgW + 10) + "' style='padding:0 0 0 " + (lado === "d" ? 12 : 0) + "px'>" + img + "</td>";
  var i2 = "<td valign='middle' width='" + (imgW + 10) + "' style='padding:0 12px 0 0'>" + img + "</td>";
  return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
    (lado === "d" ? t + i : i2 + t) + "</tr></table>";
}
function bloque_(html) {
  return "<tr><td style='padding:6px 28px 14px'>" + html + "</td></tr>";
}
function sep_() {
  return "<tr><td style='padding:6px 28px'><div style='border-top:2px dotted " + C_ROSA_CLARO + ";height:1px;line-height:1px'>&nbsp;</div></td></tr>";
}

function htmlMail_(d) {
  var serv = SERVICIOS.map(function (s) {
    var largos = "";
    if (s.x) {
      largos = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-top:10px;background:" + C_CREMA + ";border-radius:12px'>" +
        s.x.split(" · ").map(function (it) {
          var pr = partePrecio_(it);
          return "<tr><td style='padding:7px 12px;font-size:14px;color:" + C_TINTA + ";border-bottom:1px dotted " + C_ROSA_CLARO + "'>" + esc_(pr.label) + "</td>" +
            "<td align='right' style='padding:7px 12px;font-size:14px;font-weight:bold;color:" + C_ROSA + ";border-bottom:1px dotted " + C_ROSA_CLARO + "'>" + esc_(pr.precio) + "</td></tr>";
        }).join("") + "</table>";
    }
    return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:12px 0;background:#ffffff;border:1px solid #F6B7CF;border-radius:16px;overflow:hidden'>" +
      "<tr><td style='background:" + C_PALE + ";padding:12px 16px'>" +
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
          "<td style='font-family:Georgia,serif;font-size:19px;color:" + C_VERDE + ";font-weight:bold'>" + esc_(s.n) + "</td>" +
          "<td align='right' style='white-space:nowrap'><span style='display:inline-block;background:" + C_ROSA + ";color:#ffffff;font-weight:bold;font-size:16px;padding:6px 14px;border-radius:999px'>" + esc_(fmtPrecio_(s.v)) + "</span></td>" +
        "</tr></table></td></tr>" +
      "<tr><td style='padding:12px 16px 14px'>" +
        "<div style='font-size:13px;color:" + C_VERDE + ";font-weight:bold;margin-bottom:6px'>&#9719; Tiempo aproximado: " + esc_(s.t) + "</div>" +
        "<div style='font-size:14px;line-height:1.6;color:" + C_TINTA + "'>" + esc_(s.d) + "</div>" +
        largos +
      "</td></tr></table>";
  }).join("");

  var remociones = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#ffffff;border:1px solid #F6B7CF;border-radius:16px'>" +
    REMOCIONES.map(function (it, i) {
      var pr = partePrecio_(it);
      var borde = i < REMOCIONES.length - 1 ? "border-bottom:1px dotted " + C_ROSA_CLARO : "";
      return "<tr><td style='padding:10px 14px;font-size:14px;line-height:1.45;color:" + C_TINTA + ";" + borde + "'>" + esc_(pr.label) + "</td>" +
        "<td align='right' valign='middle' style='padding:10px 14px;font-size:15px;font-weight:bold;color:" + C_ROSA + ";white-space:nowrap;" + borde + "'>" + esc_(pr.precio) + "</td></tr>";
    }).join("") + "</table>";

  var efectos = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>";
  for (var i = 0; i < EFECTOS.length; i += 2) {
    efectos += "<tr>";
    for (var j = i; j < i + 2; j++) {
      var pr = partePrecio_(EFECTOS[j]);
      efectos += "<td width='50%' valign='top' style='padding:0 " + (j % 2 === 0 ? "5px 8px 0" : "0 8px 5px") + "'>" +
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:" + C_PALE + ";border-radius:12px'><tr>" +
        "<td style='padding:9px 10px;font-size:13px;color:" + C_TINTA + "'>" + esc_(pr.label) + "</td>" +
        "<td align='right' style='padding:9px 10px;font-size:14px;font-weight:bold;color:" + C_ROSA + ";white-space:nowrap'>" + esc_(pr.precio) + "</td>" +
        "</tr></table></td>";
    }
    efectos += "</tr>";
  }
  efectos += "</table>";

  var turno =
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:" + C_PALE + ";border:1px solid #F6B7CF;border-radius:16px'><tr><td style='padding:14px 18px'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='font-size:15px;color:" + C_TINTA + "'>" +
    fila_("Servicio", esc_(d.servicio)) + fila_("Día", esc_(diaCorto_(d.fecha))) + fila_("Hora", esc_(horaCorta_(d.hora))) +
    fila_("Valor del servicio", esc_(d.valor)) + fila_("Seña", "<span style='color:" + C_ROSA + ";font-weight:bold'>$10.000</span>") +
    "</table></td></tr></table>";

  var html =
    "<div style='background:#0F3123;padding:22px 8px;font-family:Arial,Helvetica,sans-serif'>" +
    "<table role='presentation' align='center' width='600' cellpadding='0' cellspacing='0' border='0' style='width:100%;max-width:600px;background:" + C_CREMA + ";border-radius:24px;overflow:hidden'>" +

    // cabecera con logo y guirnalda
    "<tr><td align='center' style='background:" + C_VERDE + ";padding:26px 20px 14px'>" +
      "<img src='" + IMG + "logo.png' width='340' alt='Chhari Chhula · El hada de las uñas' style='display:block;width:340px;max-width:90%;height:auto;border:0'></td></tr>" +
    "<tr><td style='background:" + C_VERDE + ";padding:0;line-height:0'>" +
      "<img src='" + IMG + "guirnalda.png' width='600' alt='' style='display:block;width:100%;height:auto;border:0'></td></tr>" +

    // saludo con Chari
    "<tr><td style='padding:24px 28px 8px'>" +
      "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
        "<td valign='middle' style='font-size:16px;line-height:1.55;color:" + C_TINTA + "'>" +
          "<div style='font-family:Georgia,serif;font-size:26px;color:" + C_VERDE + ";margin-bottom:8px'>Hola, <span style='color:" + C_ROSA + "'>" + esc_(d.nombre) + "</span></div>" +
          "¡Gracias por reservar en el bosque de Chari! Acá tenés todo el detalle de tu turno y lo que tenés que saber para venir." +
        "</td>" +
        "<td valign='bottom' width='140' align='right' style='padding-left:12px'><img src='" + IMG + "chari.png' width='130' alt='Chari, el hada de las uñas' style='display:block;width:130px;height:auto;border:0'></td>" +
      "</tr></table></td></tr>" +

    bloque_(titulo_("Tu turno") + turno +
      "<div style='background:" + C_PALE + ";border-radius:12px;padding:10px 14px;margin-top:12px;font-size:14px;line-height:1.5;color:" + C_TINTA + "'>" +
      "Tu turno queda <strong>confirmado cuando se acredita la seña</strong>. Después Chari te escribe por WhatsApp para dejarlo cerrado.</div>") +

    sep_() +
    bloque_(seccion_(
      titulo_("Datos de transferencia") +
      "<div style='font-size:15px;line-height:1.8;color:" + C_TINTA + "'>Alias: <strong>" + esc_(SALON.alias) + "</strong><br>Titular: <strong>" + esc_(SALON.titular) +
      "</strong><br>Celular: <strong>" + esc_(SALON.celular) + "</strong> (enviar comprobante)</div>", "hongos.png", 150, "d")) +

    sep_() +
    bloque_(seccion_(titulo_("Reserva, confirmación y cancelaciones") + lista_(RESERVA), "cristales.png", 120, "d")) +

    bloque_(titulo_("A tener en cuenta") + lista_(TENER_EN_CUENTA)) +

    sep_() +
    bloque_(titulo_("Dónde te espero") +
      "<div style='font-size:15px;margin-bottom:8px;color:" + C_TINTA + "'><strong>" + esc_(SALON.direccion) + "</strong> · Barrio " + esc_(SALON.barrio) + "</div>" +
      lista_(REGLAS)) +

    sep_() +
    bloque_(titulo_("Servicios, valores y tiempos") +
      "<div style='font-size:13px;color:#7a6b64'>Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).</div>" + serv) +

    sep_() +
    bloque_(titulo_("Valores extras") +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 10px'>Servicios adicionales que podés sumar a tu turno.</div>" +
      "<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Remociones y reconstrucción</div>" + remociones) +
    bloque_(seccion_("<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Efectos y diseños</div>" +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 8px'>Precio por servicio adicional.</div>", "flores.png", 110, "d") + efectos) +

    // pie
    "<tr><td align='center' style='background:" + C_VERDE + ";padding:22px 20px;color:" + C_ROSA_CLARO + ";font-size:15px'>" +
      "<img src='" + IMG + "logo.png' width='220' alt='Chhari Chhula' style='display:block;margin:0 auto 10px;width:220px;height:auto;border:0'>" +
      "Gracias, te espero.<br><span style='color:#ffffff'>" + esc_(SALON.instagram) + "</span></td></tr>" +

    "</table></div>";
  return html;
}
/* separa "Etiqueta: $precio" y normaliza los miles ($7000 -> $7.000) */
function fmtPrecio_(t) {
  return String(t).replace(/\$\s?(\d{4,})/g, function (m, n) {
    return "$" + n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
}
function partePrecio_(t) {
  var i = String(t).lastIndexOf(": ");
  if (i < 0) return { label: t, precio: "" };
  return { label: String(t).slice(0, i), precio: fmtPrecio_(String(t).slice(i + 2)) };
}
function fila_(a, b) {
  return "<tr><td style='padding:6px 0;color:#7a6b64'>" + a + "</td><td align='right' style='padding:6px 0'><strong>" + b + "</strong></td></tr>";
}

/** Ejecutala para recibir un mail de ejemplo en tu propia casilla. */
function probarMail() {
  enviarMail_({
    nombre: "Chari", mail: Session.getEffectiveUser().getEmail(), servicio: "Soft Gel",
    valor: "desde $35.000", fecha: "2026-10-15", hora: "10:00"
  });
}

/* ---------------- utilidades ---------------- */

function hoja_(ss, nombre, cabecera) {
  var h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    h.appendRow(cabecera);
    h.getRange(1, 1, 1, cabecera.length).setFontWeight("bold").setBackground("#f8d5e1");
    h.setFrozenRows(1);
    if (nombre === HOJA_TURNOS) estadosFormato_(h);
  }
  return h;
}

function buscar_(hoja, col, valor) {
  var ult = hoja.getLastRow();
  if (ult < 2) return 0;
  var vals = hoja.getRange(2, col, ult - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(valor)) return i + 2;
  }
  return 0;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
