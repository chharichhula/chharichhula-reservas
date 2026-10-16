/* Flujo de reserva: datos → día y horario (agenda del servidor) → seña (transferencia, Mercado Pago o seña a favor). */
(() => {
'use strict';
const C = window.CHHARI, API = window.ChhariAPI;
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const TZ = 'America/Argentina/Cordoba';

/* ---------- utilidades compartidas con gestion.js ---------- */
function el(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'text') e.textContent = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
  }
  for (const h of hijos.flat()) if (h != null) e.append(h.nodeType ? h : document.createTextNode(h));
  return e;
}
const pesos = n => '$' + Math.round(Number(n)).toLocaleString('es-AR');
const dur = m => Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
const partesFecha = f => f.split('-').map(Number);
function fechaLarga(f) {
  const [y, m, d] = partesFecha(f);
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function fechaHoraLocal(iso) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date(iso)).replace(',', '') + ' hs';
}
function diaCorto(f) { const [y, m, d] = partesFecha(f); return new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12))) + ' ' + d + '/' + m; }
function horaCorta(h) { const [a, b] = h.split(':'); return b === '00' ? Number(a) + 'hs' : Number(a) + ':' + b + 'hs'; }
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 2400); }

const App = window.ChhariApp = { el, pesos, dur, fechaLarga, fechaHoraLocal, diaCorto, horaCorta, toast, C, API };

/* ---------- estado ---------- */
const state = {
  servicio: null, datos: null, fecha: null, hora: null, clave: null,
  credito: null,               // {id, token, monto}: seña a favor a usar
  catalogo: null, mesOffset: 0, disp: new Map(), hoy: null, stepMax: 1, enviando: false
};
App.state = state;
const nuevaClave = () => 'k' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Math.random()).slice(2) + Date.now());
const sena = () => (state.catalogo && state.catalogo.sena) || C.sena;
const servicios = () => (state.catalogo ? state.catalogo.servicios.map(s => ({ id: s.id, nombre: s.nombre, valor: s.valor, tiempo: s.tiempo, min: s.min })) : C.servicios);

/* ---------- paneles ---------- */
const PANELES = ['step-1', 'step-2', 'step-3', 'step-done', 'step-manage'];
function showPanel(id, mover = true) {
  PANELES.forEach(p => { const n = $('#' + p); if (n) n.hidden = p !== id; });
  const paso = /^step-(\d)$/.exec(id);
  $('#booking-steps').hidden = !paso;
  document.querySelectorAll('#booking-steps [data-step]').forEach(b => {
    const n = Number(b.dataset.step);
    b.disabled = n > state.stepMax;
    if (paso && n === Number(paso[1])) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  const panel = $('#' + id);
  if (mover) {
    if (!reduce.matches) panel.animate([{ opacity: .4, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    $('.booking-area').scrollIntoView({ behavior: reduce.matches ? 'instant' : 'smooth', block: 'start' });
    const h = panel.querySelector('h3'); if (h) h.focus({ preventScroll: true });
  }
}
App.showPanel = showPanel;
function irAPaso(n, mover = true) {
  if (n === 2) { prepararPaso2(); }
  if (n === 3) { renderTicket(); prepararPaso3(); }
  showPanel('step-' + n, mover);
}
App.irAPaso = irAPaso;

/* ---------- catálogo y servicios ---------- */
function pintarServicios() {
  const cont = $('#services'), previo = state.servicio && state.servicio.id;
  cont.replaceChildren();
  for (const s of servicios()) {
    const input = el('input', { type: 'radio', name: 'service', value: s.id, 'aria-label': `${s.nombre}, ${s.tiempo}, ${s.valor}` });
    if (previo === s.id) input.checked = true;
    input.addEventListener('change', () => {
      if (!state.servicio || state.servicio.id !== s.id) { state.fecha = null; state.hora = null; state.clave = null; state.disp.clear(); }
      state.servicio = s;
    });
    cont.append(el('label', { class: 'service-option' }, input, el('span', { class: 'service-copy' }, el('strong', { text: s.nombre }), el('small', { text: s.tiempo + ' · incluye 4 uñas con brillo o nail art y 6 con color liso' })), el('span', { class: 'service-price', text: s.valor })));
  }
}
async function cargarCatalogo() {
  const r = await API.catalogo();
  if (r.ok) { state.catalogo = r; pintarServicios(); pintarMedios(); }
  else { pintarMedios(); }
}
function pintarMedios() {
  const mp = $('#mp-choice input'), disponible = !!(state.catalogo && state.catalogo.mercadoPago);
  mp.disabled = !disponible;
  $('#mp-small').textContent = disponible
    ? 'Pagás en Mercado Pago y volvés a tu reserva. Se confirma cuando el pago figura aprobado.'
    : 'Todavía no está disponible. Por ahora pagá por transferencia.';
  if (!disponible && mp.checked) { document.querySelector('input[name="payment-method"][value="transferencia"]').checked = true; actualizarMedio(); }
}

/* ---------- paso 1: datos ---------- */
function validarDatos() {
  const campos = { nombre: $('#nombre'), apellido: $('#apellido'), tel: $('#tel'), email: $('#email'), cumple: $('#cumple') };
  Object.values(campos).forEach(f => f.removeAttribute('aria-invalid'));
  const malos = [];
  if ($('#nombre').value.trim().length < 2) malos.push(campos.nombre);
  if ($('#apellido').value.trim().length < 2) malos.push(campos.apellido);
  const digitos = $('#tel').value.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 13) malos.push(campos.tel);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#email').value.trim())) malos.push(campos.email);
  const cu = $('#cumple').value, cd = cu ? new Date(cu + 'T00:00:00') : null;
  if (!cd || isNaN(cd) || cd > new Date() || cd.getFullYear() < 1930) malos.push(campos.cumple);
  const msgs = [];
  if (malos.some(f => f === campos.nombre || f === campos.apellido)) msgs.push('Completá tu nombre y apellido.');
  if (malos.includes(campos.tel)) msgs.push('Poné un WhatsApp válido, con característica y sin 0 ni 15.');
  if (malos.includes(campos.email)) msgs.push('Poné un email válido, por ejemplo nombre@correo.com.');
  if (malos.includes(campos.cumple)) msgs.push('Elegí tu fecha de cumpleaños.');
  if (!state.servicio) msgs.push('Elegí el servicio que te gustaría hacerte.');
  malos.forEach(f => f.setAttribute('aria-invalid', 'true'));
  return { malos, msgs };
}
$('#booking-form').addEventListener('submit', e => {
  e.preventDefault();
  const { malos, msgs } = validarDatos();
  const err = $('#form-error'); err.hidden = !msgs.length; err.textContent = msgs.join(' ');
  if (msgs.length) { (malos[0] || $('#services input')).focus(); return; }
  const nuevos = { nombre: $('#nombre').value.trim(), apellido: $('#apellido').value.trim(), tel: $('#tel').value.trim(), mail: $('#email').value.trim(), cumple: $('#cumple').value, novedades: $('#consent').checked };
  if (!state.datos || state.datos.tel !== nuevos.tel || state.datos.mail !== nuevos.mail) state.clave = null;
  state.datos = nuevos; state.stepMax = Math.max(state.stepMax, 2);
  irAPaso(2);
});
document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
  const n = Number(b.dataset.step);
  if (n > state.stepMax) return;
  if (n === 1) { showPanel('step-1'); return; }
  irAPaso(n);
}));

/* ---------- paso 2: calendario con la agenda del servidor ---------- */
function mesBase() {
  const h = state.hoy ? partesFecha(state.hoy) : (() => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; })();
  return { y: h[0], m: h[1] - 1 + state.mesOffset };
}
function limitesMes() {
  const { y, m } = mesBase(), ini = new Date(Date.UTC(y, m, 1)), fin = new Date(Date.UTC(y, m + 1, 0));
  const f = d => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  return { ini, fin, desde: f(ini), hasta: f(fin), dias: fin.getUTCDate(), offset: (ini.getUTCDay() + 6) % 7 };
}
async function cargarMes() {
  const { desde, hasta } = limitesMes(), clave = state.servicio.id + '|' + desde;
  const c = state.disp.get(clave);
  if (c && Date.now() - c.t < 45000) return c.fechas;
  const r = await API.disponibilidad(state.servicio.id, desde, hasta);
  if (!r.ok) throw r;
  if (r.ahora) { const d = new Date(Date.parse(r.ahora) - 3 * 3600000); state.hoy = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  state.disp.set(clave, { t: Date.now(), fechas: r.fechas });
  return r.fechas;
}
function prepararPaso2() {
  $('#service-summary').textContent = state.servicio.nombre + ' · ' + dur(state.servicio.min);
  renderCalendario();
}
async function renderCalendario() {
  const estado = $('#calendar-status'), dias = $('#calendar-days');
  const { ini, dias: cuenta, offset } = limitesMes();
  $('#month-label').textContent = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(ini);
  const tope = (state.catalogo && state.catalogo.mesesAdelante) || 2;
  $('#prev-month').disabled = state.mesOffset === 0; $('#next-month').disabled = state.mesOffset >= tope;
  dias.setAttribute('aria-busy', 'true'); dias.replaceChildren(); estado.replaceChildren(document.createTextNode('Buscando lugares disponibles…'));
  const pedido = state.servicio.id + ':' + state.mesOffset;
  let fechas;
  try { fechas = await cargarMes(); }
  catch (r) {
    if (pedido !== state.servicio.id + ':' + state.mesOffset) return;
    dias.removeAttribute('aria-busy');
    estado.replaceChildren(document.createTextNode((r && r.mensaje) || 'No pudimos cargar la agenda. '), el('button', { type: 'button', class: 'text-button', text: 'Reintentar', onclick: () => renderCalendario() }));
    renderHoras(); return;
  }
  if (pedido !== state.servicio.id + ':' + state.mesOffset) return;
  dias.removeAttribute('aria-busy');
  const hayAlguno = Object.keys(fechas).some(f => fechas[f].length);
  estado.textContent = (state.aviso ? state.aviso + ' ' : '') + (hayAlguno ? '' : 'No quedan lugares este mes. Probá con el mes siguiente o escribile a Chhari por WhatsApp.');
  state.aviso = '';
  for (let i = 0; i < offset; i++) dias.append(el('span', { class: 'day-blank', 'aria-hidden': 'true' }));
  const mm = String(ini.getUTCMonth() + 1).padStart(2, '0');
  for (let d = 1; d <= cuenta; d++) {
    const f = ini.getUTCFullYear() + '-' + mm + '-' + String(d).padStart(2, '0'), libres = fechas[f] || [];
    const b = el('button', { type: 'button', text: String(d), 'aria-pressed': String(state.fecha === f) });
    b.disabled = !libres.length;
    b.setAttribute('aria-label', fechaLarga(f) + (libres.length ? ', ' + libres.length + (libres.length === 1 ? ' horario' : ' horarios') : ', sin lugar'));
    b.addEventListener('click', () => {
      state.fecha = f; state.hora = null; state.clave = null;
      dias.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      renderHoras();
    });
    dias.append(b);
  }
  renderHoras();
}
function renderHoras() {
  const cont = $('#times'); cont.replaceChildren();
  $('#review-booking').disabled = !(state.fecha && state.hora);
  if (!state.fecha) { $('#date-label').textContent = 'Elegí un día para ver los horarios'; return; }
  $('#date-label').textContent = fechaLarga(state.fecha);
  const { desde } = limitesMes(), c = state.disp.get(state.servicio.id + '|' + desde), libres = (c && c.fechas[state.fecha]) || [];
  if (!libres.length) { cont.append(el('p', { class: 'form-note', text: 'Ese día se llenó. Probá con otro.' })); return; }
  for (const h of libres) {
    const b = el('button', { type: 'button', text: h, 'aria-pressed': String(state.hora === h), 'aria-label': h + ' hs' });
    b.addEventListener('click', () => {
      state.hora = h; state.clave = null;
      cont.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      $('#review-booking').disabled = false;
    });
    cont.append(b);
  }
}
$('#prev-month').addEventListener('click', () => { if (state.mesOffset > 0) { state.mesOffset--; state.fecha = null; state.hora = null; renderCalendario(); } });
$('#next-month').addEventListener('click', () => { state.mesOffset++; state.fecha = null; state.hora = null; renderCalendario(); });
$('#review-booking').addEventListener('click', () => { state.stepMax = 3; irAPaso(3); });

/* ---------- paso 3: seña ---------- */
function filasTicket(extra) {
  const s = state.servicio, d = state.datos;
  const rows = [['Nombre', d.nombre + ' ' + d.apellido], ['Servicio', s.nombre], ['Día', fechaLarga(state.fecha)], ['Hora', state.hora + ' hs'], ['Duración', dur(s.min)], ['Valor del servicio', s.valor], ['Seña', pesos(sena())]];
  return rows.concat(extra || []);
}
function pintarTicket(dl, rows) {
  dl.replaceChildren();
  for (const [a, b] of rows) dl.append(el('div', {}, el('dt', { text: a }), el('dd', { text: b })));
}
function renderTicket() {
  const extra = [];
  if (state.credito) {
    const cubre = Math.min(state.credito.monto, sena());
    extra.push(['Seña a favor aplicada', '− ' + pesos(cubre)], ['Resta pagar', pesos(sena() - cubre)]);
  }
  pintarTicket($('#booking-ticket'), filasTicket(extra));
}
function medioActual() { const r = document.querySelector('input[name="payment-method"]:checked'); return r ? r.value : 'transferencia'; }
function totalmenteCubierto() { return !!state.credito && state.credito.monto >= sena(); }
function actualizarMedio() {
  const mp = medioActual() === 'mercadopago', cubierto = totalmenteCubierto();
  $('#payment-methods').hidden = cubierto;
  $('#transfer-details').hidden = cubierto || mp; $('#mp-details').hidden = cubierto || !mp;
  const b = $('#reserve-button'), txt = cubierto ? 'Confirmar con mi seña a favor' : mp ? 'Pagar con Mercado Pago' : 'Reservar y ver datos de transferencia';
  b.replaceChildren(document.createTextNode(txt + ' '), flecha());
}
function flecha() { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M4 12h16m-6-6 6 6-6 6'); s.append(p); return s; }
document.querySelectorAll('input[name="payment-method"]').forEach(i => i.addEventListener('change', actualizarMedio));
function prepararPaso3() {
  const c = $('#credit-applied');
  if (state.credito) { c.hidden = false; c.textContent = 'Tu seña a favor de ' + pesos(state.credito.monto) + ' se aplica a esta cita. No es una devolución de dinero.'; } else c.hidden = true;
  $('#reserve-error').hidden = true; $('#reserve-button').disabled = false;
  actualizarMedio();
}
function textoPolitica() {
  const ul = $('#policy-list'); ul.replaceChildren(...C.politica.map(t => el('li', { text: t })));
  $('#before-list').replaceChildren(el('p', { class: 'mini-title', text: 'Para tu turno' }), el('ul', {}, C.tenerEnCuenta.map(t => el('li', { text: t }))),
    el('p', { class: 'mini-title', text: 'Dónde te espero' }), el('p', { text: C.salon.direccion + ' · Barrio ' + C.salon.barrio + ' · ' }, el('a', { href: C.salon.mapa, target: '_blank', rel: 'noopener', text: 'Cómo llegar' })),
    el('ul', {}, C.reglas.map(t => el('li', { text: t }))));
}

const MENSAJES_ERROR = {
  ocupado: 'Ese horario se acaba de ocupar. Elegí otro, por favor.', horario: 'Ese horario ya no está disponible. Elegí otro, por favor.', anticipacion: 'Ese horario ya no está disponible. Elegí otro, por favor.',
  limite: 'Ya tenés reservas esperando la seña. Completalas o esperá a que venzan antes de pedir otra.',
  credito: 'No pudimos usar tu seña a favor (debe coincidir con tu WhatsApp). Podés reservar pagando la seña.',
  mp_no_configurado: 'Mercado Pago todavía no está disponible. Pagá por transferencia.', mp_error: 'No pudimos abrir Mercado Pago ahora. Probá de nuevo o pagá por transferencia.'
};
function urlSegura(u) {
  try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)mercadopago\.(com\.ar|com)$/.test(x.hostname) || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)); } catch (e) { return false; }
}
async function reservar() {
  if (state.enviando) return;
  const err = $('#reserve-error'), b = $('#reserve-button');
  err.hidden = true;
  if (!state.clave) state.clave = nuevaClave();
  const medio = totalmenteCubierto() ? 'transferencia' : medioActual();
  state.enviando = true; b.disabled = true; b.setAttribute('aria-busy', 'true');
  const previo = b.textContent; b.textContent = medio === 'mercadopago' ? 'Abriendo Mercado Pago…' : 'Guardando tu lugar…';
  const payload = Object.assign({}, state.datos, { servicio: state.servicio.id, fecha: state.fecha, hora: state.hora, medio, clave: state.clave });
  if (state.credito) payload.credito = { id: state.credito.id, token: state.credito.token };
  const r = await API.reservar(payload);
  state.enviando = false; b.removeAttribute('aria-busy');
  if (!r.ok) {
    b.disabled = false; actualizarMedio();
    let m = MENSAJES_ERROR[r.error] || r.mensaje || 'No pudimos guardar tu reserva. Probá de nuevo.';
    if (r.error === 'red') m = 'No pudimos confirmar si tu reserva se guardó. Tocá de nuevo el botón: si ya se guardó, no se duplica.';
    err.textContent = m; err.hidden = false;
    if (['ocupado', 'horario', 'anticipacion'].includes(r.error)) { state.disp.clear(); state.hora = null; state.clave = null; state.aviso = m; irAPaso(2); }
    if (r.error === 'credito') { state.credito = null; $('#credit-applied').hidden = true; renderTicket(); actualizarMedio(); }
    if (r.error === 'datos') { state.clave = null; }
    err.focus && err.focus();
    return;
  }
  try { localStorage.setItem('chhari_ultima', JSON.stringify({ id: r.id, token: r.token })); } catch (e) { /* sin almacenamiento */ }
  if (state.credito) { state.credito = null; $('#credit-banner').hidden = true; }
  if (r.checkout) {
    if (!urlSegura(r.checkout.url)) { err.textContent = 'La dirección de pago no es válida. Pagá por transferencia o escribinos.'; err.hidden = false; b.disabled = false; return; }
    b.textContent = 'Redirigiendo a Mercado Pago…';
    location.assign(r.checkout.url);
    return;
  }
  App.renderDone({ id: r.id, token: r.token, reserva: r.reserva, transferencia: r.transferencia });
}
$('#reserve-button').addEventListener('click', reservar);

/* ---------- navegación del recorrido ---------- */
App.iniciarConCredito = cred => {
  state.credito = cred; state.stepMax = 1; state.clave = null; state.fecha = null; state.hora = null;
  const b = $('#credit-banner'); b.hidden = false;
  b.textContent = 'Vas a usar tu seña a favor de ' + pesos(cred.monto) + '. Completá tus datos con el mismo WhatsApp de tu reserva anterior y elegí el nuevo día.';
  showPanel('step-1');
};
App.resumenFilas = filasTicket;
App.pintarTicket = pintarTicket;

textoPolitica(); pintarServicios(); pintarMedios(); cargarCatalogo();
window.ChhariBooking = { state };
})();
