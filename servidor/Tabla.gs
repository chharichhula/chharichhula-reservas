/* ---------- planilla como base de datos (cada hoja = una tabla) ---------- */

var HOJAS_ = {
  Reservas: ["id","creado","estado","pago","medio","inicio","fin","fecha","hora","servicio_id","servicio","valor",
             "duracion_min","sena","credito","por_pagar","nombre","apellido","whatsapp","whatsapp_wa","mail","cumple",
             "novedades","token_hash","vence","cancelada_en","clave","preferencia","init_point","nota","mensaje","enviar_whatsapp"],
  Pagos: ["proveedor","pago_id","reserva_id","monto","moneda","estado_mp","estado","receptor","modo","creado","actualizado","nota"],
  Creditos: ["id","origen_reserva","origen_pago","whatsapp_wa","monto","estado","aplicado_en","creado","actualizado","nota"],
  Eventos: ["evento_id","tiempo","reserva_id","tipo","detalle"],
  Bloqueos: ["fecha","desde","hasta","motivo"]
};

var LIBRO_ = null, HOJAS_ABIERTAS_ = {};   // se reinician en cada ejecución: evitan abrir la planilla decenas de veces

function libro_() {
  if (LIBRO_) return LIBRO_;
  var id = propiedad_("SHEET_ID");
  if (!id) throw new Error("Falta la propiedad SHEET_ID (ver SERVIDOR.md).");
  LIBRO_ = SpreadsheetApp.openById(id);
  return LIBRO_;
}

function hoja_(nombre) {
  if (HOJAS_ABIERTAS_[nombre]) return HOJAS_ABIERTAS_[nombre];
  var ss = libro_(), h = ss.getSheetByName(nombre);
  if (!h) {
    var cab = HOJAS_[nombre];
    h = ss.insertSheet(nombre);
    h.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight("bold").setBackground("#f8d5e1");
    h.setFrozenRows(1);
    // todo se guarda como texto: evita que Sheets convierta fechas, horas o números
    h.getRange(2, 1, 2000, cab.length).setNumberFormat("@");
  }
  HOJAS_ABIERTAS_[nombre] = h;
  return h;
}

/** Los tests (y nada más) reinician el estado de la ejecución. */
function reiniciarCache_() { LIBRO_ = null; HOJAS_ABIERTAS_ = {}; }

function celda_(v) {
  if (v === null || v === undefined) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") return v.toISOString();
  return String(v);
}

/** Lee toda la tabla como lista de objetos (con _fila = número de fila en la hoja). */
function leer_(nombre) {
  var h = hoja_(nombre), cab = HOJAS_[nombre], ult = h.getLastRow();
  if (ult < 2) return [];
  var vals = h.getRange(2, 1, ult - 1, cab.length).getValues(), out = [];
  for (var i = 0; i < vals.length; i++) {
    var o = { _fila: i + 2 }, vacia = true;
    for (var c = 0; c < cab.length; c++) { o[cab[c]] = celda_(vals[i][c]); if (o[cab[c]] !== "") vacia = false; }
    if (!vacia) out.push(o);
  }
  return out;
}

/** Columnas que se escriben como valores (en Reservas la última es una fórmula HYPERLINK y no se pisa). */
function anchoEscritura_(nombre) { return nombre === "Reservas" ? HOJAS_[nombre].length - 1 : HOJAS_[nombre].length; }

function filaAArray_(nombre, o) {
  var cab = HOJAS_[nombre].slice(0, anchoEscritura_(nombre));
  return cab.map(function (k) { return o[k] === undefined || o[k] === null ? "" : String(o[k]); });
}

function agregar_(nombre, o) {
  var h = hoja_(nombre), fila = Math.max(h.getLastRow(), 1) + 1;
  h.getRange(fila, 1, 1, anchoEscritura_(nombre)).setNumberFormat("@").setValues([filaAArray_(nombre, o)]);
  o._fila = fila;
  return o;
}

/** Cambia campos de una fila y devuelve el objeto actualizado. */
function actualizar_(nombre, o, cambios) {
  for (var k in cambios) o[k] = cambios[k];
  var h = hoja_(nombre);
  h.getRange(o._fila, 1, 1, anchoEscritura_(nombre)).setNumberFormat("@").setValues([filaAArray_(nombre, o)]);
  return o;
}

/** Registro de eventos. Con "clave" es idempotente: la misma clave no se registra dos veces. */
function evento_(reservaId, tipo, detalle, clave) {
  if (clave) {
    var h = hoja_("Eventos"), ult = h.getLastRow();
    if (ult >= 2) {
      var ids = h.getRange(2, 1, ult - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === clave) return false;
    }
  }
  agregar_("Eventos", {
    evento_id: clave || Utilities.getUuid(), tiempo: new Date(ahora_()).toISOString(),
    reserva_id: reservaId || "", tipo: tipo, detalle: detalle ? JSON.stringify(detalle) : ""
  });
  return true;
}

/** Exclusión mutua: todo lo que lee, decide y escribe agenda, pagos o créditos va acá. */
function conLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function reservaPorId_(id) {
  var r = leer_("Reservas");
  for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i];
  return null;
}
