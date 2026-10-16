'use strict';
/**
 * Entorno de prueba: ejecuta el código REAL de servidor/*.gs en Node con una réplica en memoria de los
 * servicios de Google (planilla, bloqueo, propiedades, mails) y un Mercado Pago simulado.
 * No toca ninguna cuenta, planilla ni cobro real.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ARCHIVOS = ['Config', 'Util', 'Tabla', 'Agenda', 'Gestion', 'Pagos', 'Mail', 'Api', 'Admin'];

function crearEntorno(opciones = {}) {
  const estado = {
    ahora: opciones.ahora || Date.parse('2026-10-19T15:00:00Z'),   // lunes 19/10/2026 12:00 hora de Córdoba
    mails: [], fetches: [], libros: {}, props: {}, cache: new Map(), triggers: [],
    mp: { pagos: new Map(), preferencias: new Map(), sinCredenciales: false, falloPreferencia: false, usuario: { id: 777, nickname: 'CHHARI_TEST' } },
    lockTomado: false, lockVeces: 0, bloqueosRechazados: 0, enLockRegistro: [], alEscribir: null
  };

  /* ---------- planilla en memoria ---------- */
  class Rango {
    constructor(h, r, c, nr, nc) { this.h = h; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) { const fila = []; for (let j = 0; j < this.nc; j++) fila.push(this.h.leer(this.r + i, this.c + j)); out.push(fila); }
      return out;
    }
    getValue() { return this.h.leer(this.r, this.c); }
    setValues(v) {
      if (estado.alEscribir) estado.alEscribir(this.h.nombre, this.r);
      for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.h.escribir(this.r + i, this.c + j, v[i][j]);
      return this;
    }
    setValue(v) { this.h.escribir(this.r, this.c, v); return this; }
    setFormula(f) { this.h.formulas.set(this.r + ':' + this.c, f); this.h.datos.set(this.r + ':' + this.c, ''); return this; }
    setNumberFormat(f) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.h.formatos.set((this.r + i) + ':' + (this.c + j), f); return this; }
    getRow() { return this.r; }
    setFontWeight() { return this; } setBackground() { return this; } setDataValidation() { return this; } setVerticalAlignment() { return this; }
    setWrapStrategy() { return this; } setHorizontalAlignment() { return this; }
  }
  class Hoja {
    constructor(nombre) { this.nombre = nombre; this.datos = new Map(); this.formatos = new Map(); this.formulas = new Map(); }
    leer(r, c) {
      const k = r + ':' + c;
      if (this.formulas.has(k)) { const m = /;"([^"]*)"\)$/.exec(this.formulas.get(k)); return m ? m[1] : ''; }
      return this.datos.has(k) ? this.datos.get(k) : '';
    }
    escribir(r, c, v) {
      const k = r + ':' + c;
      this.formulas.delete(k);
      if (this.formatos.get(k) === '@' || typeof v !== 'string') { this.datos.set(k, v === undefined ? '' : v); return; }
      // sin formato de texto, Sheets reinterpreta lo escrito (esto detecta errores de formato)
      if (/^-?\d+(\.\d+)?$/.test(v)) this.datos.set(k, Number(v));
      else if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/.test(v)) this.datos.set(k, new Date(v));
      else this.datos.set(k, v);
    }
    getRange(r, c, nr = 1, nc = 1) { return new Rango(this, r, c, nr, nc); }
    getLastRow() { let m = 0; for (const [k, v] of this.datos) { const r = Number(k.split(':')[0]); if (v !== '' && r > m) m = r; } for (const k of this.formulas.keys()) m = Math.max(m, Number(k.split(':')[0])); return m; }
    appendRow(arr) { const r = this.getLastRow() + 1; arr.forEach((v, i) => this.escribir(r, i + 1, v)); }
    setFrozenRows() { return this; }
  }
  class Libro {
    constructor() { this.hojas = new Map(); }
    getSheetByName(n) { return this.hojas.get(n) || null; }
    insertSheet(n) { const h = new Hoja(n); this.hojas.set(n, h); return h; }
  }

  /* ---------- servicios de Google ---------- */
  const lock = {
    waitLock() { if (estado.lockTomado) { estado.bloqueosRechazados++; throw new Error('BLOQUEO_OCUPADO: otra ejecución tiene el bloqueo (en Google esperaría)'); } estado.lockTomado = true; estado.lockVeces++; },
    releaseLock() { estado.lockTomado = false; }
  };
  const bytes = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));
  const sandbox = {
    console, JSON, Math, Date, Object, Array, String, Number, RegExp, Error, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    NOW_FN_: () => estado.ahora,
    SpreadsheetApp: {
      openById(id) { return estado.libros[id] || (estado.libros[id] = new Libro()); },
      newDataValidation() { const b = { requireValueInList() { return b; }, setAllowInvalid() { return b; }, build() { return {}; } }; return b; },
      getUi() { return { alert(t) { estado.ultimaAlerta = t; return 'OK'; }, ButtonSet: { YES_NO: 1, OK_CANCEL: 2 }, Button: { YES: 'YES', OK: 'OK' }, createMenu() { const m = { addItem() { return m; }, addSeparator() { return m; }, addToUi() {} }; return m; } }; },
      WrapStrategy: { CLIP: 'CLIP' }
    },
    LockService: { getScriptLock() { return lock; } },
    PropertiesService: { getScriptProperties() { return { getProperty: k => (k in estado.props ? estado.props[k] : null), setProperty: (k, v) => { estado.props[k] = String(v); } }; } },
    CacheService: { getScriptCache() { return { get: k => { const e = estado.cache.get(k); return e && e.hasta > estado.ahora ? e.v : null; }, put: (k, v, s) => estado.cache.set(k, { v, hasta: estado.ahora + (s || 60) * 1000 }) }; } },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeDigest: (alg, s) => bytes(crypto.createHash('sha256').update(String(s), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => bytes(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput(t) { return { contenido: t, setMimeType() { return this; }, getContent() { return t; } }; } },
    MailApp: { sendEmail(o) { estado.mails.push(o); } },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'chari@chhari.test' }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }),
      getProjectTriggers: () => [], deleteTrigger() {}, newTrigger() { const t = { timeBased() { return t; }, everyMinutes() { return t; }, create() { estado.triggers.push(1); } }; return t; }
    },
    Logger: { log() {} },
    UrlFetchApp: { fetch: (url, o) => mpFalso(url, o || {}) }
  };

  /* ---------- Mercado Pago simulado (solo lo que usa el servidor) ---------- */
  function resp(code, json) { return { getResponseCode: () => code, getContentText: () => (json === undefined ? '' : JSON.stringify(json)) }; }
  function mpFalso(url, o) {
    const u = new URL(url), met = (o.method || 'get').toLowerCase(), ruta = u.pathname;
    const body = o.payload ? JSON.parse(o.payload) : null;
    estado.fetches.push({ met, ruta, query: u.search, body, headers: o.headers });
    if (!/^Bearer /.test((o.headers || {}).Authorization || '')) return resp(401, { message: 'unauthorized' });
    if (met === 'post' && ruta === '/checkout/preferences') {
      if (estado.mp.falloPreferencia) return resp(500, { message: 'error' });
      const id = 'PREF-' + (estado.mp.preferencias.size + 1);
      const pref = Object.assign({}, body, { id, init_point: (estado.mp.base || 'https://www.mercadopago.test/') + 'checkout/v1/redirect?pref_id=' + id, sandbox_init_point: 'https://sandbox.mercadopago.test/' + id });
      estado.mp.preferencias.set(id, pref);
      return resp(201, pref);
    }
    if (met === 'get' && ruta === '/users/me') return resp(200, estado.mp.usuario);
    if (met === 'get' && ruta.startsWith('/v1/payments/search')) {
      const ref = u.searchParams.get('external_reference');
      return resp(200, { results: [...estado.mp.pagos.values()].filter(p => p.external_reference === ref) });
    }
    const m = /^\/v1\/payments\/(.+)$/.exec(ruta);
    if (met === 'get' && m) { const p = estado.mp.pagos.get(decodeURIComponent(m[1])); return p ? resp(200, p) : resp(404, { message: 'not found' }); }
    return resp(404, {});
  }

  const ctx = vm.createContext(sandbox);
  if (process.env.BUNDLE) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'Codigo-completo.gs'), 'utf8'), ctx, { filename: 'Codigo-completo.gs' });
  else for (const f of ARCHIVOS) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f + '.gs'), 'utf8'), ctx, { filename: f + '.gs' });

  estado.props.SHEET_ID = 'HOJA_DE_PRUEBA';
  if (opciones.mp !== false) { estado.props.MP_ACCESS_TOKEN = 'TEST-token-de-prueba'; estado.props.MP_MODO = 'prueba'; estado.props.MP_COLLECTOR_ID = '777'; }

  /* ---------- utilidades para los tests ---------- */
  const entorno = {
    ctx, estado,
    llamar(accion, cuerpo = {}) {
      ctx.reiniciarCache_();
      const r = ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(Object.assign({ action: accion }, cuerpo)) } });
      return JSON.parse(r.getContent());
    },
    get(parametros) { ctx.reiniciarCache_(); return JSON.parse(ctx.doGet({ parameter: parametros }).getContent()); },
    webhook(paymentId, { k, tipo = 'payment' } = {}) {
      const clave = k === undefined ? estado.props.MP_WEBHOOK_KEY : k;
      ctx.reiniciarCache_();
      const r = ctx.doPost({ parameter: { action: 'mp_webhook', k: clave, type: tipo, 'data.id': String(paymentId) }, postData: { contents: JSON.stringify({ type: tipo, data: { id: String(paymentId) } }) } });
      return JSON.parse(r.getContent());
    },
    /** Crea/actualiza un pago en el Mercado Pago simulado. */
    pago(id, reservaId, extra = {}) {
      const p = Object.assign({ id: Number(id), status: 'approved', status_detail: 'accredited', external_reference: reservaId, transaction_amount: 10000, currency_id: 'ARS', collector_id: 777, live_mode: false, date_created: new Date(estado.ahora).toISOString() }, extra);
      estado.mp.pagos.set(String(id), p); return p;
    },
    avanzar(ms) { estado.ahora += ms; },
    ahora() { return estado.ahora; },
    hoja(n) { return estado.libros.HOJA_DE_PRUEBA && estado.libros.HOJA_DE_PRUEBA.getSheetByName(n); },
    filas(n) { return ctx.leer_(n); },
    reserva(id) { return ctx.reservaPorId_(id); },
    /** Primer horario libre de un servicio a partir de N días. */
    primerHorario(servicio, desdeDias = 6, orden = 0) {
      const f0 = ctx.aLocal_(estado.ahora + desdeDias * 86400000).fecha;
      const r = entorno.get({ action: 'availability', servicio, desde: f0, hasta: ctx.sumarDias_(f0, 10) });
      const dias = Object.keys(r.fechas).filter(d => r.fechas[d].length);
      return { fecha: dias[0], hora: r.fechas[dias[0]][orden] };
    },
    datos(extra = {}) {
      return Object.assign({ nombre: 'Luz', apellido: 'Pérez', tel: '351 555 1234', mail: 'luz@correo.com', cumple: '1992-10-30', novedades: true, servicio: 'rusa', medio: 'transferencia',
        clave: 'k' + crypto.randomUUID().replace(/-/g, '') }, extra);
    }
  };
  return entorno;
}

module.exports = { crearEntorno };
