/* ---------- mails (estética de Chhari; las imágenes viven en /email/ del sitio publicado) ---------- */

var IMG = "https://chharichhula.github.io/chharichhula-reservas/email/";

function estadoTexto_(d, tipo) {
  if (tipo === "cancelada") return "Cancelada";
  if (tipo === "confirmada") return "Confirmada · seña acreditada";
  if (d.estado === "Revisión") return "En revisión de Chhari";
  return "Pendiente de seña";
}
function saludoTexto_(tipo) {
  if (tipo === "confirmada") return "¡Tu turno está confirmado! Acá tenés el detalle y lo que tenés que saber para venir.";
  if (tipo === "cancelada") return "Cancelaste tu turno. Liberamos el horario; abajo te contamos qué pasa con tu seña.";
  return "¡Gracias por reservar en el bosque de Chari! Guardamos tu lugar. Acá tenés el detalle y lo que tenés que saber.";
}
function avisoHtml_(d, tipo) {
  var t;
  if (tipo === "confirmada") t = "Tu turno quedó <strong>confirmado</strong>: la seña figura acreditada. ¡Te espero!";
  else if (tipo === "cancelada") t = Number(d.creditoGenerado) > 0
    ? "Tu seña de <strong>" + pesos_(d.creditoGenerado) + "</strong> quedó <strong>a tu favor</strong> para reprogramar. No es una devolución de dinero. Podés usarla una sola vez, entrando al enlace de abajo y eligiendo un nuevo día."
    : "No había una seña acreditada, así que no se generó saldo a favor.";
  else t = "Guardamos tu lugar hasta <strong>" + esc_(d.venceTexto || "unas horas") + "</strong>. Tu turno queda <strong>confirmado cuando se acredita la seña</strong>; en ese momento te llega otro mail. Si ya transferiste, enviale el comprobante a Chari por WhatsApp.";
  return "<div style='background:" + C_PALE + ";border-radius:12px;padding:10px 14px;margin-top:12px;font-size:14px;line-height:1.5;color:" + C_TINTA + "'>" + t + "</div>";
}
function gestionHtml_(d, tipo, link) {
  var boton = "<a href='" + esc_(link) + "' style='display:inline-block;background:" + C_ROSA + ";color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:999px'>" + (tipo === "cancelada" ? "Ver mi seña a favor" : "Gestionar mi cita") + "</a>";
  var nota = tipo === "cancelada" ? "" :
    "<div style='font-size:13px;line-height:1.5;color:#7a6b64;margin-top:10px'>Con este enlace privado podés ver tu cita y cancelarla hasta <strong>72 hs antes</strong>. Entre 72 y 24 hs antes, escribile a Chari para reprogramar según su agenda. No lo compartas: da acceso a tu reserva.</div>";
  return titulo_("Tu enlace privado") + "<div style='margin:6px 0'>" + boton + "</div>" + nota;
}
function asuntoMail_(d, tipo) {
  var cuando = diaCorto_(d.fecha) + " a las " + horaCorta_(d.hora);
  if (tipo === "confirmada") return "Turno confirmado en Chhari Chhula · " + cuando;
  if (tipo === "cancelada") return "Cancelaste tu turno en Chhari Chhula · " + cuando;
  return "Guardamos tu lugar en Chhari Chhula · " + cuando;
}

function textoMail_(d, tipo, link) {
  var L = ["Hola " + d.nombre + ",", "", saludoTexto_(tipo), "", "TU TURNO",
    "Servicio: " + d.servicio + " (" + d.valor + ")", "Día: " + diaCorto_(d.fecha), "Hora: " + horaCorta_(d.hora),
    "Seña: " + pesos_(d.sena), "Estado: " + estadoTexto_(d, tipo), ""];
  if (tipo === "cancelada") {
    L.push(Number(d.creditoGenerado) > 0 ? "Tu seña de " + pesos_(d.creditoGenerado) + " quedó a tu favor para reprogramar (no es una devolución de dinero)." : "No había seña acreditada.");
    L.push("", "Ver mi seña a favor: " + link);
    return L.join("\n");
  }
  if (tipo === "recibida") {
    L.push("Tu turno queda confirmado cuando se acredita la seña. Si ya transferiste, enviale el comprobante a Chari por WhatsApp.", "",
      "DATOS DE TRANSFERENCIA", "Alias: " + CFG.SALON.alias, "Titular: " + CFG.SALON.titular, "Celular: " + CFG.SALON.celular + " (enviar comprobante)", "");
  }
  L.push("GESTIONAR MI CITA (enlace privado, no lo compartas)", link, "Cancelación online hasta 72 hs antes. Entre 72 y 24 hs antes, reprogramás directamente con Chari según disponibilidad.", "");
  L.push("RESERVA, CONFIRMACIÓN Y CANCELACIONES"); RESERVA.forEach(function (x) { L.push("- " + x); });
  L.push("", "A TENER EN CUENTA"); TENER_EN_CUENTA.forEach(function (x) { L.push("- " + x); });
  L.push("", "DÓNDE TE ESPERO", CFG.SALON.direccion + " · Barrio " + CFG.SALON.barrio); REGLAS.forEach(function (x) { L.push("- " + x); });
  L.push("", "SERVICIOS, VALORES Y TIEMPOS", "Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).");
  SERVICIOS.forEach(function (s) { L.push("", s.n + " · " + s.v + " · " + s.t, s.d); if (s.x) L.push(s.x); });
  L.push("", "VALORES EXTRAS"); REMOCIONES.forEach(function (x) { L.push("- " + x); }); EFECTOS.forEach(function (x) { L.push("- " + x); });
  L.push("", "Gracias, te espero.", CFG.SALON.instagram);
  return L.join("\n");
}

/** Envía el mail correspondiente. Tipos: recibida (transferencia pendiente), confirmada, cancelada. */
function enviarMail_(r, tipo, token) {
  if (!r || !r.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.mail)) return false;
  try {
    var d = {}; for (var k in r) d[k] = r[k];
    if (r.vence) { var l = aLocal_(msDe_(r.vence)); d.venceTexto = diaCorto_(l.fecha) + " " + horaCorta_(l.hora); }
    if (tipo === "cancelada") {
      var cs = leer_("Creditos").filter(function (c) { return c.origen_reserva === r.id; });
      d.creditoGenerado = cs.reduce(function (a, c) { return a + Number(c.monto); }, 0);
    }
    var link = CFG.SITIO + "#gestionar=" + r.id + "." + token;
    var yo = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({ to: r.mail, bcc: yo, replyTo: yo, subject: asuntoMail_(d, tipo),
      body: textoMail_(d, tipo, link), htmlBody: htmlMail_(d, tipo, link), name: "Chhari Chhula" });
    evento_(r.id, "mail_" + tipo, { a: r.mail });
    return true;
  } catch (err) {
    try { evento_(r.id, "error_mail", { e: String(err), tipo: tipo }); } catch (e2) { /* nada */ }
    return false;
  }
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

function htmlMail_(d, tipo, link) {
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
    fila_("Valor del servicio", esc_(d.valor)) + fila_("Seña", "<span style='color:" + C_ROSA + ";font-weight:bold'>" + pesos_(d.sena) + "</span>") + (Number(d.credito) > 0 ? fila_("Seña a favor aplicada", esc_(pesos_(d.credito))) : "") + fila_("Estado", esc_(estadoTexto_(d, tipo))) +
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
          saludoTexto_(tipo) +
        "</td>" +
        "<td valign='bottom' width='140' align='right' style='padding-left:12px'><img src='" + IMG + "chari.png' width='130' alt='Chari, el hada de las uñas' style='display:block;width:130px;height:auto;border:0'></td>" +
      "</tr></table></td></tr>" +

    bloque_(titulo_("Tu turno") + turno + avisoHtml_(d, tipo)) +
    bloque_(gestionHtml_(d, tipo, link)) +

    (tipo === "recibida" ? (    sep_() +
    bloque_(seccion_(
      titulo_("Datos de transferencia") +
      "<div style='font-size:15px;line-height:1.8;color:" + C_TINTA + "'>Alias: <strong>" + esc_(CFG.SALON.alias) + "</strong><br>Titular: <strong>" + esc_(CFG.SALON.titular) +
      "</strong><br>Celular: <strong>" + esc_(CFG.SALON.celular) + "</strong> (enviar comprobante)</div>", "hongos.png", 150, "d"))) : "") +

    (tipo !== "cancelada" ? (
    sep_() +
    bloque_(seccion_(titulo_("Reserva, confirmación y cancelaciones") + lista_(RESERVA), "cristales.png", 120, "d")) +

    bloque_(titulo_("A tener en cuenta") + lista_(TENER_EN_CUENTA)) +

    sep_() +
    bloque_(titulo_("Dónde te espero") +
      "<div style='font-size:15px;margin-bottom:8px;color:" + C_TINTA + "'><strong>" + esc_(CFG.SALON.direccion) + "</strong> · Barrio " + esc_(CFG.SALON.barrio) + "</div>" +
      lista_(REGLAS)) +

    sep_() +
    bloque_(titulo_("Servicios, valores y tiempos") +
      "<div style='font-size:13px;color:#7a6b64'>Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).</div>" + serv) +

    sep_() +
    bloque_(titulo_("Valores extras") +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 10px'>Servicios adicionales que podés sumar a tu turno.</div>" +
      "<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Remociones y reconstrucción</div>" + remociones) +
    bloque_(seccion_("<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Efectos y diseños</div>" +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 8px'>Precio por servicio adicional.</div>", "flores.png", 110, "d") + efectos)
    ) : "") +

    // pie
    "<tr><td align='center' style='background:" + C_VERDE + ";padding:22px 20px;color:" + C_ROSA_CLARO + ";font-size:15px'>" +
      "<img src='" + IMG + "logo.png' width='220' alt='Chhari Chhula' style='display:block;margin:0 auto 10px;width:220px;height:auto;border:0'>" +
      "Gracias, te espero.<br><span style='color:#ffffff'>" + esc_(CFG.SALON.instagram) + "</span></td></tr>" +

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

