/* ---------- utilidades (sin dependencias de la planilla) ---------- */

function ahora_() { return (typeof NOW_FN_ === "function") ? NOW_FN_() : Date.now(); }
function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function aMin_(h) { var p = String(h).split(":"); return Number(p[0]) * 60 + Number(p[1]); }
function minAHora_(m) { return pad2_(Math.floor(m / 60)) + ":" + pad2_(m % 60); }

/** "2026-10-20" + "14:00" (hora de Córdoba) -> milisegundos UTC */
function aMs_(fecha, hora) {
  var f = String(fecha).split("-"), h = String(hora).split(":");
  return Date.UTC(Number(f[0]), Number(f[1]) - 1, Number(f[2]), Number(h[0]), Number(h[1])) - CFG.TZ_MIN * 60000;
}
/** milisegundos UTC -> {fecha:"YYYY-MM-DD", hora:"HH:MM", dow} en hora de Córdoba */
function aLocal_(ms) {
  var d = new Date(ms + CFG.TZ_MIN * 60000);
  return {
    fecha: d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate()),
    hora: pad2_(d.getUTCHours()) + ":" + pad2_(d.getUTCMinutes()),
    dow: d.getUTCDay()
  };
}
function dowDe_(fecha) {
  var f = String(fecha).split("-");
  return new Date(Date.UTC(Number(f[0]), Number(f[1]) - 1, Number(f[2]))).getUTCDay();
}
function fechaValida_(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f))) return false;
  var p = String(f).split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}
function sumarDias_(fecha, n) {
  var p = String(fecha).split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate());
}
/** Último día permitido para reservar: fin del mes (actual + MESES_ADELANTE). */
function ultimoDiaReservable_() {
  var h = aLocal_(ahora_()).fecha.split("-").map(Number);
  var d = new Date(Date.UTC(h[0], h[1] - 1 + CFG.MESES_ADELANTE + 1, 0));
  return d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(extra) { var o = { ok: true }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
function err_(codigo, mensaje, extra) { var o = { ok: false, error: codigo, mensaje: mensaje }; for (var k in (extra || {})) o[k] = extra[k]; return o; }

function propiedad_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }

function bytesHex_(b) {
  return b.map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length < 2 ? "0" + v : v; }).join("");
}
function hash_(t) {
  return bytesHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8));
}
/** Clave interna para derivar los enlaces privados (se crea sola la primera vez; vive solo en las propiedades del script). */
function claveTokens_() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty("TOKEN_KEY");
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty("TOKEN_KEY", k); }
  return k;
}
/** Token privado de una reserva = HMAC-SHA256(clave interna, id). En la planilla solo queda su hash. */
function tokenDe_(id) {
  return bytesHex_(Utilities.computeHmacSha256Signature("reserva:" + id, claveTokens_()));
}
function igualesSeguro_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function idNuevo_() {
  var u = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  return "R-" + u.slice(0, 8);
}

/** WhatsApp en formato internacional argentino (549…), igual que la web. */
function waNumber_(t) {
  var d = String(t == null ? "" : t).replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  if (d.indexOf("0") === 0) d = d.slice(1);
  if (d.indexOf("54") === 0) return d.indexOf("549") === 0 ? d : "549" + d.slice(2);
  return "549" + d.replace(/^15/, "");
}

function pesos_(n) { return "$" + String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function servicioPorId_(id) { for (var i = 0; i < SERVICIOS.length; i++) if (SERVICIOS[i].id === id) return SERVICIOS[i]; return null; }
function esc_(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function diaCorto_(f) {
  var p = String(f).split("-"), dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return dias[dowDe_(f)] + " " + Number(p[2]) + "/" + Number(p[1]);
}
function horaCorta_(h) {
  var p = String(h).split(":");
  return p[1] === "00" ? Number(p[0]) + "hs" : Number(p[0]) + ":" + p[1] + "hs";
}
