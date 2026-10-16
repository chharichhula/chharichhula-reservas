/* Confirmación, retorno de Mercado Pago y gestión privada de la cita (ver, cancelar, usar la seña a favor). */
(() => {
'use strict';
const App = window.ChhariApp, { el, pesos, dur, fechaLarga, fechaHoraLocal, diaCorto, horaCorta, toast, C, API } = App;
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let sondeo = null;

/* ---------- piezas reutilizables ---------- */
function ticketDe(r) {
  const filas = [['Nombre', r.nombre], ['Servicio', r.servicio], ['Día', fechaLarga(r.fecha)], ['Hora', r.hora + ' hs'], ['Duración', dur(r.duracionMin)], ['Valor del servicio', r.valor], ['Seña', pesos(r.sena)]];
  if (r.credito > 0) filas.push(['Seña a favor aplicada', pesos(r.credito)]);
  if (r.estado === 'Pendiente' && r.porPagar > 0) filas.push(['Seña a pagar', pesos(r.porPagar)]);
  const dl = el('dl', { class: 'booking-ticket' });
  App.pintarTicket(dl, filas);
  return dl;
}
function etiquetaEstado(r) {
  const m = { Confirmada: 'Confirmada · seña acreditada', Pendiente: r.pago === 'Pendiente' ? 'Pago en proceso' : r.pago === 'Rechazado' ? 'Pago rechazado' : 'Pendiente de seña', Cancelada: 'Cancelada', Vencida: 'Tiempo de pago vencido', 'Revisión': 'En revisión de Chhari', 'No asistió': 'No asistió' };
  return m[r.estado] || r.estado;
}
function insignia(r) { return el('p', { class: 'estado-reserva estado-' + r.estado.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''), text: etiquetaEstado(r) }); }

function mensajeWhatsApp(r, datos) {
  const L = ['¡Hola Chari! 🧚🏻‍♀️💖', `Soy ${datos ? datos.nombre + ' ' + datos.apellido : r.nombre} y te envío el comprobante de la seña de mi turno 💅🏻✨`, '',
    `🌸 Servicio: *${r.servicio}*`, `📅 Día: *${diaCorto(r.fecha)} a las ${horaCorta(r.hora)}*`, `💸 Seña: ${pesos(r.porPagar || r.sena)} ✔️ (te mando el comprobante 🧾)`, `🔖 Reserva: ${r.id}`, ''];
  if (datos) L.push(`📲 Mi WhatsApp: ${datos.tel}`, `💌 Mi mail: ${datos.mail}`, `🎂 Mi cumple: ${datos.cumple.split('-').reverse().join('/')}`, '');
  L.push('📸 Te paso por acá una foto de mis uñas y del diseño que quiero 💕', '', '¡Gracias, Chari! Nos vemos en el bosque 🌿🍄🫰🏼✨');
  return L.join('\n');
}
const waLink = (r, datos) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensajeWhatsApp(r, datos))}`;
function linkCalendario(r) {
  const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ini = new Date(r.inicio), fin = new Date(ini.getTime() + r.duracionMin * 60000);
  const lugar = 'Las Playas 1717, Villa Cabrera, Córdoba';
  const desc = `${r.servicio}. Reserva ${r.id}. Instagram ${C.salon.instagram}`;
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('💅 Manicura · Chhari Chhula') + '&dates=' + f(ini) + '/' + f(fin) + '&details=' + encodeURIComponent(desc) + '&location=' + encodeURIComponent(lugar) + '&ctz=America/Argentina/Cordoba';
}
function cajaTransferencia(t, r, datos) {
  const copiar = async () => { try { await navigator.clipboard.writeText(t.alias); toast('Alias copiado'); } catch (e) { toast('Seleccioná el alias y copialo'); } };
  return el('div', { class: 'payment-detail' },
    el('h4', { text: 'Transferí la seña de ' + pesos(t.monto) }),
    el('div', { class: 'alias-row' }, el('code', { text: t.alias }), el('button', { type: 'button', class: 'copy-alias', onclick: copiar, text: 'Copiar alias' })),
    el('p', { text: 'Titular: ' + t.titular }),
    el('p', { text: 'Después de transferir, podés enviarle el comprobante a Chhari por WhatsApp (es voluntario y ayuda a confirmar más rápido). Tu turno queda confirmado cuando Chhari verifica que la seña se acreditó; te avisamos por mail.' }),
    el('a', { class: 'pink-button wide', href: waLink(r, datos), target: '_blank', rel: 'noopener', text: 'Enviar comprobante por WhatsApp' }));
}
function recordatorios() {
  return el('details', { class: 'booking-policy', open: true }, el('summary', { text: 'Antes de venir' }),
    el('p', { class: 'mini-title', text: 'Para tu turno' }), el('ul', {}, C.tenerEnCuenta.map(t => el('li', { text: t }))),
    el('p', { class: 'mini-title', text: 'Dónde te espero' }),
    el('p', {}, C.salon.direccion + ' · Barrio ' + C.salon.barrio + ' · ', el('a', { href: C.salon.mapa, target: '_blank', rel: 'noopener', text: 'Cómo llegar' })),
    el('ul', {}, C.reglas.map(t => el('li', { text: t }))),
    el('p', { class: 'form-note', text: 'Los pagos se abonan antes de retirarse del salón. Recibimos efectivo y transferencias.' }));
}
function accionesComunes(ref, r, datos) {
  const box = el('div', { class: 'acciones' });
  if (r.estado === 'Confirmada' || r.estado === 'Pendiente') box.append(el('a', { class: 'pink-button wide ghost', href: linkCalendario(r), target: '_blank', rel: 'noopener', text: 'Agregar a Google Calendar' }));
  if (ref && ref.token) box.append(el('button', { type: 'button', class: 'pink-button wide ghost', onclick: () => abrirGestion(ref), text: 'Gestionar o cancelar mi cita' }));
  box.append(el('button', { type: 'button', class: 'text-button', onclick: reiniciar, text: 'Hacer otra reserva' }));
  return box;
}
function reiniciar() {
  clearTimeout(sondeo);
  const s = App.state; s.stepMax = 1; s.fecha = null; s.hora = null; s.clave = null; s.disp.clear();
  App.showPanel('step-1');
}

/* ---------- pantalla de confirmación / estado ---------- */
function celebrar() { document.dispatchEvent(new CustomEvent('chhari:celebrar')); }
function renderDone(d) {
  const r = d.reserva, ref = d.id && d.token ? { id: d.id, token: d.token } : null, datos = App.state.datos;
  const body = $('#done-body'), titulo = $('#done-title'), lead = el('p', { class: 'panel-lead' });
  body.replaceChildren();
  let extra = null;
  if (r.estado === 'Confirmada') { titulo.textContent = 'Tu turno está confirmado'; lead.textContent = 'La seña figura acreditada. Te esperamos en el bosque. También te enviamos un mail con el detalle.'; celebrar(); }
  else if (r.estado === 'Pendiente' && r.medio === 'transferencia') {
    titulo.textContent = 'Tu lugar está guardado';
    lead.textContent = 'Guardamos tu horario hasta ' + fechaHoraLocal(r.vence) + '. Tu turno se confirma cuando Chhari verifique la seña. Te enviamos un mail con todo el detalle.';
    extra = cajaTransferencia(d.transferencia || { alias: 'virgo.30', titular: 'Carolina Micaela Marengo', monto: r.porPagar }, r, datos);
  } else if (r.estado === 'Pendiente' && r.pago === 'Pendiente') { titulo.textContent = 'Estamos verificando tu pago'; lead.textContent = 'Mercado Pago informa tu pago como pendiente. Tu turno se confirma apenas figure aprobado; no hace falta que hagas nada más. Te avisamos por mail.'; }
  else if (r.estado === 'Pendiente' && r.pago === 'Rechazado') {
    titulo.textContent = 'El pago no se completó'; lead.textContent = 'Mercado Pago no aprobó el pago. Tu horario sigue guardado un rato: podés intentar de nuevo o pagar por transferencia.';
    extra = el('div', { class: 'acciones' }, el('button', { type: 'button', class: 'pink-button wide', onclick: () => reintentarMP(ref), text: 'Intentar de nuevo con Mercado Pago' }), el('button', { type: 'button', class: 'pink-button wide ghost', onclick: () => cambiarATransferencia(ref), text: 'Pagar por transferencia' }));
  } else if (r.estado === 'Pendiente') { titulo.textContent = 'Tu pago todavía no se registró'; lead.textContent = 'No encontramos un pago aprobado. Si ya pagaste, puede demorar unos minutos; te avisamos por mail. Si no, podés retomar el pago.'; extra = el('div', { class: 'acciones' }, el('button', { type: 'button', class: 'pink-button wide', onclick: () => reintentarMP(ref), text: 'Pagar con Mercado Pago' }), el('button', { type: 'button', class: 'pink-button wide ghost', onclick: () => cambiarATransferencia(ref), text: 'Pagar por transferencia' })); }
  else if (r.estado === 'Vencida') { titulo.textContent = 'Se venció el tiempo para pagar'; lead.textContent = 'No recibimos la seña a tiempo y el horario se liberó. Si pagaste hace instantes, revisá tu mail: lo resolvemos con vos.'; }
  else if (r.estado === 'Revisión') { titulo.textContent = 'Estamos revisando tu reserva'; lead.textContent = 'Recibimos tu pago pero el horario necesita una revisión. Chhari te va a contactar para resolverlo. No se pierde tu seña.'; }
  else if (r.estado === 'Cancelada') { titulo.textContent = 'Esta reserva fue cancelada'; lead.textContent = 'El horario fue liberado.'; }
  else { titulo.textContent = 'Tu reserva'; lead.textContent = etiquetaEstado(r); }
  body.append(lead, insignia(r), ticketDe(r));
  if (extra) body.append(extra);
  if (r.estado === 'Pendiente' || r.estado === 'Confirmada') body.append(recordatorios());
  body.append(accionesComunes(ref, r, datos));
  App.showPanel('step-done');
}
App.renderDone = renderDone;

async function reintentarMP(ref) {
  if (!ref) return;
  const x = await API.medio(ref.id, ref.token, 'mercadopago');
  if (x.ok && x.checkout) { location.assign(x.checkout.url); return; }
  toast(x.mensaje || 'No pudimos abrir Mercado Pago.');
}
async function cambiarATransferencia(ref) {
  if (!ref) return;
  const x = await API.medio(ref.id, ref.token, 'transferencia');
  if (x.ok) renderDone({ id: ref.id, token: ref.token, reserva: x.reserva, transferencia: x.transferencia });
  else toast(x.mensaje || 'No pudimos cambiar el medio de pago.');
}

/* ---------- retorno de Mercado Pago ---------- */
async function consultar(ref) { return API.estado(ref.id, ref.token); }
function leerUltima() { try { return JSON.parse(localStorage.getItem('chhari_ultima') || 'null'); } catch (e) { return null; } }

async function retornoMercadoPago(tipo) {
  const ref = leerUltima();
  $('#reserva').scrollIntoView({ behavior: 'instant' });
  const cuerpo = $('#done-body'), titulo = $('#done-title');
  if (!ref) {
    titulo.textContent = 'Volviste desde Mercado Pago'; cuerpo.replaceChildren(el('p', { class: 'panel-lead', text: 'Si tu pago fue aprobado, recibís el mail de confirmación con el enlace privado de tu cita. Si no te llega en unos minutos, escribile a Chhari por WhatsApp.' }), el('a', { class: 'pink-button wide', href: 'https://wa.me/' + C.whatsapp, target: '_blank', rel: 'noopener', text: 'Escribir a Chhari' }));
    App.showPanel('step-done', false); return;
  }
  titulo.textContent = 'Estamos verificando tu pago';
  cuerpo.replaceChildren(el('p', { class: 'panel-lead', role: 'status', text: 'Consultando el estado de tu pago… Tu turno se confirma solo cuando Mercado Pago lo informa aprobado.' }));
  App.showPanel('step-done', false);
  const esperas = tipo === 'error' ? [0] : [0, 2500, 4000, 6000, 8000, 10000, 12000];
  for (let i = 0; i < esperas.length; i++) {
    if (esperas[i]) await new Promise(res => { sondeo = setTimeout(res, esperas[i]); });
    const r = await consultar(ref);
    if (!r.ok) { if (r.error === 'no_autorizado') break; continue; }
    const listo = r.reserva.estado !== 'Pendiente' || r.reserva.pago === 'Rechazado' || i === esperas.length - 1;
    renderDone({ id: ref.id, token: ref.token, reserva: r.reserva, transferencia: r.transferencia });
    if (listo) return;
  }
}

/* ---------- gestión privada ---------- */
function leerGestion() { try { return JSON.parse(sessionStorage.getItem('chhari_gestion') || 'null'); } catch (e) { return null; } }
async function abrirGestion(ref) {
  ref = ref || leerGestion() || leerUltima();
  if (!ref) return;
  try { sessionStorage.setItem('chhari_gestion', JSON.stringify(ref)); } catch (e) { /* nada */ }
  const body = $('#manage-body'), titulo = $('#manage-title');
  titulo.textContent = 'Tu cita';
  body.replaceChildren(el('p', { class: 'panel-lead', role: 'status', text: 'Buscando tu reserva…' }));
  App.showPanel('step-manage');
  const r = await consultar(ref);
  body.replaceChildren();
  if (!r.ok) {
    body.append(el('p', { class: 'panel-lead', text: r.error === 'no_autorizado' ? 'El enlace no es válido o ya no está activo. Usá el enlace más reciente que te llegó por mail.' : (r.mensaje || 'No pudimos cargar tu reserva.') }), el('a', { class: 'pink-button wide', href: 'https://wa.me/' + C.whatsapp, target: '_blank', rel: 'noopener', text: 'Escribir a Chhari' }));
    return;
  }
  pintarGestion(ref, r);
}
function pintarGestion(ref, r) {
  const v = r.reserva, body = $('#manage-body'); body.replaceChildren();
  body.append(el('p', { class: 'panel-lead', text: 'Hola, ' + v.nombre + '. Acá podés ver tu cita y, si estás a tiempo, cancelarla.' }), insignia(v), ticketDe(v));
  const contacto = el('a', { class: 'pink-button wide ghost', href: r.contacto || 'https://wa.me/' + C.whatsapp, target: '_blank', rel: 'noopener', text: 'Escribir a Chhari por WhatsApp' });
  if (v.estado === 'Pendiente' && r.transferencia) body.append(cajaTransferencia(r.transferencia, v, null));
  if (v.estado === 'Pendiente' && v.medio === 'mercadopago') body.append(el('div', { class: 'acciones' }, el('button', { type: 'button', class: 'pink-button wide', onclick: () => reintentarMP(ref), text: 'Pagar con Mercado Pago' })));
  if (v.estado === 'Confirmada' || v.estado === 'Pendiente') {
    if (v.puedeCancelar) {
      body.append(el('p', { class: 'politica-info', text: v.estado === 'Confirmada' ? 'Podés cancelar desde acá hasta 72 horas antes de tu cita (faltan ' + Math.floor(v.horasRestantes) + ' h). Se libera el horario y tu seña acreditada queda a tu favor para reprogramar. La seña no se devuelve como dinero.' : 'Todavía no se acreditó la seña, así que podés cancelar y liberar el horario sin costo.' }));
      body.append(confirmacionCancelar(ref, v));
    } else if (v.politica === 'reprogramar_con_chhari') {
      body.append(el('p', { class: 'politica-info', text: 'Faltan menos de 72 horas: ya no se puede cancelar desde la web. Escribile a Chhari para reprogramar según su disponibilidad. La seña se conserva si avisás con al menos 24 horas y reprogramás en un horario de la agenda.' }), contacto);
    } else if (v.politica === 'contactar_chhari') {
      body.append(el('p', { class: 'politica-info', text: 'Faltan menos de 24 horas: contactá a Chhari para gestionar tu cita. Recordá que si no asistís la seña se pierde.' }), contacto);
    }
    body.append(el('a', { class: 'pink-button wide ghost', href: linkCalendario(v), target: '_blank', rel: 'noopener', text: 'Agregar a Google Calendar' }));
  }
  if (v.estado === 'Cancelada' || v.estado === 'Vencida') {
    if (r.credito) {
      body.append(el('div', { class: 'deposit-note' }, el('strong', { text: 'Tenés una seña a favor de ' + pesos(r.credito.monto) }), el('p', { text: 'Queda registrada a tu nombre para reprogramar. No es una devolución de dinero y se usa una sola vez.' })),
        el('button', { type: 'button', class: 'pink-button wide', onclick: () => App.iniciarConCredito({ id: ref.id, token: ref.token, monto: r.credito.monto }), text: 'Reprogramar con mi seña a favor' }));
    } else body.append(el('p', { class: 'politica-info', text: 'No hay una seña acreditada asociada a esta reserva.' }));
  }
  if (v.estado === 'Revisión') body.append(el('p', { class: 'politica-info', text: 'Chhari está revisando tu reserva y te va a contactar.' }), contacto);
  body.append(el('button', { type: 'button', class: 'text-button', onclick: reiniciar, text: 'Hacer otra reserva' }));
}
function confirmacionCancelar(ref, v) {
  const caja = el('div', { class: 'cancelar-box' });
  const pedir = el('button', { type: 'button', class: 'pink-button wide danger', text: 'Cancelar mi cita', onclick: () => { pedir.hidden = true; confirmar.hidden = false; confirmar.querySelector('button').focus(); } });
  const confirmar = el('div', { class: 'confirmar-cancelar', role: 'group', 'aria-label': 'Confirmar la cancelación', hidden: true },
    el('p', { class: 'politica-info', text: 'Vas a cancelar tu cita del ' + fechaLarga(v.fecha) + ' a las ' + v.hora + ' hs (' + v.servicio + '). Esta acción libera el horario.' }),
    el('button', { type: 'button', class: 'pink-button wide danger', text: 'Sí, cancelar mi cita', onclick: async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Cancelando…';
      const x = await API.cancelar(ref.id, ref.token);
      if (!x.ok) { b.disabled = false; b.textContent = 'Sí, cancelar mi cita'; toast(x.mensaje || 'No pudimos cancelar.'); if (x.error === 'fuera_de_plazo') abrirGestion(ref); return; }
      toast('Cita cancelada'); abrirGestion(ref);
    } }),
    el('button', { type: 'button', class: 'pink-button wide ghost', text: 'Mantener mi cita', onclick: () => { confirmar.hidden = true; pedir.hidden = false; pedir.focus(); } }));
  caja.append(pedir, confirmar);
  return caja;
}

/* ---------- arranque: enlaces privados y retorno de pago ---------- */
function arrancar() {
  const q = new URLSearchParams(location.search), retorno = q.get('retorno');
  const h = /^#gestionar=([A-Za-z0-9-]+)\.([a-f0-9]{32,128})$/i.exec(location.hash);
  if (h) {
    const ref = { id: h[1], token: h[2] };
    try { sessionStorage.setItem('chhari_gestion', JSON.stringify(ref)); } catch (e) { /* nada */ }
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { $('#reserva').scrollIntoView({ behavior: 'instant' }); abrirGestion(ref); }, 450);
  } else if (retorno && /^(exito|pendiente|error)$/.test(retorno)) {
    q.delete('retorno'); ['collection_id', 'collection_status', 'payment_id', 'status', 'external_reference', 'payment_type', 'merchant_order_id', 'preference_id', 'site_id', 'processing_mode', 'merchant_account_id'].forEach(k => q.delete(k));
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
    setTimeout(() => retornoMercadoPago(retorno), 450);
  }
}
App.abrirGestion = abrirGestion;
arrancar();
addEventListener('hashchange', () => { if (/^#gestionar=/.test(location.hash)) arrancar(); });
})();
