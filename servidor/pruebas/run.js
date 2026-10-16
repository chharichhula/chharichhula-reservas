'use strict';
const assert = require('assert');
const { crearEntorno } = require('./entorno');

const H = 3600000;
const resultados = [];
function prueba(nombre, fn) {
  try { fn(); resultados.push([true, nombre]); console.log('  ✔ ' + nombre); }
  catch (e) { resultados.push([false, nombre, e]); console.log('  ✘ ' + nombre + '\n      ' + (e.message || e).split('\n')[0]); }
}
function grupo(t) { console.log('\n' + t); }

/** Reserva lista para usar: devuelve {e, id, token, fecha, hora}. */
function reservar(e, extra = {}, dias = 6, orden = 0) {
  const sv = extra.servicio || 'rusa';
  const { fecha, hora } = extra.fecha ? extra : e.primerHorario(sv, dias, orden);
  const r = e.llamar('reserve', e.datos(Object.assign({ servicio: sv, fecha, hora }, extra)));
  return Object.assign({ fecha, hora }, r);
}
function mailsDe(e, tipoAsunto) { return e.estado.mails.filter(m => m.subject.includes(tipoAsunto)); }
/** Lleva el reloj a "horas antes del inicio". */
function aHorasDelInicio(e, r, horas) { e.estado.ahora = Date.parse(e.reserva(r.id).inicio) - horas * H; }

/* ============================================================ */
grupo('Disponibilidad compartida (servidor)');
{
  const e = crearEntorno();
  prueba('catálogo y disponibilidad no exponen datos personales ni secretos', () => {
    const c = JSON.stringify(e.get({ action: 'catalogo' }));
    assert(!/TEST-token|MP_|token_hash|@/.test(c.replace('chari@', '')), 'catálogo con datos de más');
    const { fecha, hora } = e.primerHorario('soft');
    reservar(e, { servicio: 'soft', fecha, hora });
    const d = JSON.stringify(e.get({ action: 'availability', servicio: 'rusa', desde: fecha, hasta: fecha }));
    assert(!/Luz|Pérez|351|correo|R-/.test(d), 'la disponibilidad filtra datos');
  });
  prueba('un turno largo bloquea los horarios que se solapan (no solo la misma hora)', () => {
    const e2 = crearEntorno();
    const a = reservar(e2, { servicio: 'soft', fecha: '2026-10-27', hora: '10:00' });   // 10:00–13:00
    assert(a.ok, JSON.stringify(a));
    const d = e2.get({ action: 'availability', servicio: 'rusa', desde: '2026-10-27', hasta: '2026-10-27' }).fechas['2026-10-27'];
    assert(!d.includes('10:00') && !d.includes('11:00') && !d.includes('12:00'), 'quedaron horarios solapados: ' + d);
    assert(d.includes('09:00') && d.includes('13:00'), 'el turno de 1 h a las 09:00 y 13:00 no se solapa: ' + d);
    const b = e2.llamar('reserve', e2.datos({ servicio: 'rusa', fecha: '2026-10-27', hora: '12:00' }));
    assert.strictEqual(b.error, 'ocupado');
  });
  prueba('el horario depende de la duración del servicio y del cierre del salón', () => {
    const e2 = crearEntorno();
    const sab = e2.get({ action: 'availability', servicio: 'soft', desde: '2026-10-24', hasta: '2026-10-24' }).fechas['2026-10-24'];
    assert.deepStrictEqual(sab, ['10:00', '11:00', '12:00', '13:00', '14:00']);        // cierra 17:00; soft = 3 h
    const dom = e2.get({ action: 'availability', servicio: 'rusa', desde: '2026-10-25', hasta: '2026-10-25' }).fechas['2026-10-25'];
    assert.deepStrictEqual(dom, []);
  });
  prueba('respeta 12 h de anticipación y el límite de meses', () => {
    const e2 = crearEntorno();   // lunes 19/10 12:00
    const hoy = e2.get({ action: 'availability', servicio: 'rusa', desde: '2026-10-19', hasta: '2026-10-19' }).fechas['2026-10-19'];
    assert.deepStrictEqual(hoy, []);                                                   // 12:00 + 12 h = 00:00 del día siguiente
    const lejos = e2.llamar('reserve', e2.datos({ servicio: 'rusa', fecha: '2027-01-12', hora: '10:00' }));
    assert.strictEqual(lejos.ok, false);
  });
  prueba('bloqueos cargados por Chhari en la hoja "Bloqueos" cierran días u horas', () => {
    const e2 = crearEntorno();
    e2.ctx.hoja_('Bloqueos').getRange(2, 1, 2, 4).setValues([['2026-10-28', '', '', 'Feriado'], ['2026-10-29', '9:00', '12:00', 'Médico']]);
    const a = e2.get({ action: 'availability', servicio: 'rusa', desde: '2026-10-28', hasta: '2026-10-29' }).fechas;
    assert.deepStrictEqual(a['2026-10-28'], []);
    assert(!a['2026-10-29'].includes('09:00') && !a['2026-10-29'].includes('11:00') && a['2026-10-29'].includes('12:00'), JSON.stringify(a['2026-10-29']));
  });
}

grupo('Reservas simultáneas y bloqueo atómico');
{
  prueba('dos personas piden el mismo horario: gana una sola', () => {
    const e = crearEntorno();
    const { fecha, hora } = e.primerHorario('rusa');
    const a = e.llamar('reserve', e.datos({ fecha, hora, tel: '351 111 1111', mail: 'a@a.com' }));
    const b = e.llamar('reserve', e.datos({ fecha, hora, tel: '351 222 2222', mail: 'b@b.com' }));
    assert(a.ok && !b.ok && b.error === 'ocupado');
    assert.strictEqual(e.filas('Reservas').length, 1);
  });
  prueba('la lectura-decisión-escritura corre dentro del bloqueo y un segundo pedido no puede colarse en medio', () => {
    const e = crearEntorno();
    const { fecha, hora } = e.primerHorario('rusa');
    let intento = null;
    // Mientras la primera ejecución escribe en la planilla (dentro del bloqueo), entra otra ejecución:
    e.estado.alEscribir = (hoja) => {
      if (hoja === 'Reservas' && !intento) {
        e.estado.alEscribir = null;
        const consola = console.error; console.error = () => {};
        try { intento = e.llamar('reserve', e.datos({ fecha, hora, tel: '351 999 9999', mail: 'x@x.com' })); } finally { console.error = consola; }
      }
    };
    const a = e.llamar('reserve', e.datos({ fecha, hora }));
    assert(a.ok);
    assert(intento && intento.ok === false && e.estado.bloqueosRechazados === 1, 'la segunda ejecución debía quedar esperando el bloqueo');
    assert.strictEqual(e.filas('Reservas').length, 1, 'la segunda ejecución no pudo escribir mientras la primera tenía el bloqueo');
    const b = e.llamar('reserve', e.datos({ fecha, hora, tel: '351 999 9999', mail: 'x@x.com' }));   // cuando se libera, ya ve el lugar ocupado
    assert.strictEqual(b.error, 'ocupado');
    assert.strictEqual(e.estado.lockTomado, false, 'el bloqueo debe liberarse');
  });
  prueba('reintento con la misma clave (doble clic / red caída) no duplica la reserva', () => {
    const e = crearEntorno();
    const { fecha, hora } = e.primerHorario('rusa');
    const d = e.datos({ fecha, hora });
    const a = e.llamar('reserve', d), b = e.llamar('reserve', d);
    assert(a.ok && b.ok && b.existente && a.id === b.id && a.token === b.token);
    assert.strictEqual(e.filas('Reservas').length, 1);
    assert.strictEqual(mailsDe(e, 'Guardamos tu lugar').length, 1, 'un solo mail');
  });
  prueba('límite de reservas pendientes por teléfono y validación de datos', () => {
    const e = crearEntorno();
    for (let i = 0; i < 2; i++) assert(e.llamar('reserve', e.datos({ fecha: '2026-10-2' + (7 + i), hora: '10:00' })).ok);
    const tercera = e.llamar('reserve', e.datos({ fecha: '2026-10-30', hora: '10:00' }));
    assert.strictEqual(tercera.error, 'limite');
    assert.strictEqual(e.llamar('reserve', e.datos({ fecha: '2026-10-27', hora: '15:00', nombre: '', tel: '12', mail: 'mal' })).error, 'datos');
    assert.strictEqual(e.llamar('reserve', e.datos({ fecha: '2026-10-27', hora: '10:30' })).ok, false);                 // hora que no existe
    assert.strictEqual(e.llamar('reserve', e.datos({ servicio: 'inventado', fecha: '2026-10-27', hora: '10:00' })).error, 'datos');
    assert.strictEqual(e.llamar('reserve', e.datos({ fecha: '2026-10-27', hora: '10:00', web: 'bot' })).ok, false);       // honeypot
  });
}

grupo('Transferencia');
{
  prueba('crea reserva pendiente, no confirma por sí sola y envía mail con alias, titular y enlace privado', () => {
    const e = crearEntorno();
    const r = reservar(e);
    assert(r.ok && r.reserva.estado === 'Pendiente' && r.reserva.pago === 'Sin pago');
    assert.deepStrictEqual([r.transferencia.alias, r.transferencia.titular, r.transferencia.monto], ['virgo.30', 'Carolina Micaela Marengo', 10000]);
    const m = mailsDe(e, 'Guardamos tu lugar')[0];
    assert(m && m.body.includes('virgo.30') && m.htmlBody.includes('#gestionar=' + r.id + '.' + r.token));
    assert(!JSON.stringify(e.filas('Reservas')).includes(r.token), 'el token no debe guardarse en la planilla (solo su hash)');
  });
  prueba('Chhari confirma tras verificar la acreditación: pasa a Confirmada, registra el pago y avisa una sola vez', () => {
    const e = crearEntorno();
    const r = reservar(e);
    const c = e.ctx.confirmarTransferencia_(r.id);
    assert(c.ok && c.reserva.estado === 'Confirmada' && c.reserva.pago === 'Acreditado');
    assert.strictEqual(e.filas('Pagos').filter(p => p.reserva_id === r.id && p.estado === 'Acreditado').length, 1);
    const otra = e.ctx.confirmarTransferencia_(r.id);
    assert(otra.yaConfirmada);
    assert.strictEqual(mailsDe(e, 'Turno confirmado').length, 1);
  });
  prueba('el bloqueo de la transferencia vence y libera el horario; confirmar después falla si otra persona lo tomó', () => {
    const e = crearEntorno();
    const r = reservar(e);
    e.avanzar(13 * H);
    const d = e.get({ action: 'availability', servicio: 'rusa', desde: r.fecha, hasta: r.fecha }).fechas[r.fecha];
    assert(d.includes(r.hora), 'el horario debía liberarse');
    const otra = e.llamar('reserve', e.datos({ fecha: r.fecha, hora: r.hora, tel: '351 777 7777', mail: 'o@o.com' }));
    assert(otra.ok);
    const c = e.ctx.confirmarTransferencia_(r.id);
    assert.strictEqual(c.error, 'ocupado');
    e.ctx.conLock_(() => e.ctx.vencerCaducadas_());
    assert.strictEqual(e.reserva(r.id).estado, 'Vencida');
  });
}

grupo('Mercado Pago · Checkout Pro');
{
  prueba('la preferencia se crea en el servidor con monto, referencia, URLs y sin exponer credenciales', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    assert(r.ok && r.checkout && r.checkout.url.startsWith('https://www.mercadopago.test/'), JSON.stringify(r));
    const f = e.estado.fetches.find(x => x.ruta === '/checkout/preferences');
    assert.strictEqual(f.body.items[0].unit_price, 10000);
    assert.strictEqual(f.body.items[0].currency_id, 'ARS');
    assert.strictEqual(f.body.external_reference, r.id);
    assert.strictEqual(f.body.auto_return, 'approved');
    assert(f.body.back_urls.success.startsWith('https://chharichhula.github.io/chharichhula-reservas/'));
    assert(!/localhost|127\.0\.0\.1/.test(JSON.stringify(f.body.back_urls)));
    assert(/^https:\/\/.+\?action=mp_webhook&k=[0-9a-f]{40,}/.test(f.body.notification_url));
    assert(f.headers.Authorization === 'Bearer TEST-token-de-prueba');
    assert(!JSON.stringify(r).includes('TEST-token'), 'el token no puede viajar al navegador');
    assert(!JSON.stringify(r).includes(e.estado.props.MP_WEBHOOK_KEY), 'la clave del webhook no puede viajar al navegador');
  });
  prueba('volver del checkout NO confirma: sin pago verificado sigue Pendiente (aunque la URL diga approved)', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    const s = e.llamar('status', { id: r.id, token: r.token, status: 'approved', payment_id: '999' });
    assert(s.ok && s.reserva.estado === 'Pendiente' && s.reserva.pago === 'Sin pago');
  });
  prueba('pago aprobado por webhook: confirma, registra el pago y manda un solo mail', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5001, r.id);
    const w = e.webhook(5001);
    assert(w.ok && w.resultado === 'confirmada', JSON.stringify(w));
    const x = e.reserva(r.id);
    assert(x.estado === 'Confirmada' && x.pago === 'Acreditado' && x.medio === 'mercadopago' && x.vence === '');
    assert.strictEqual(mailsDe(e, 'Turno confirmado').length, 1);
  });
  prueba('webhook duplicado / reintento: idempotente (sin segundo pago, correo ni evento)', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5002, r.id);
    e.webhook(5002);
    const pagos = e.filas('Pagos').length, ev = e.filas('Eventos').length, mails = e.estado.mails.length;
    for (let i = 0; i < 3; i++) assert.strictEqual(e.webhook(5002).resultado, 'sin_cambios');
    assert.deepStrictEqual([e.filas('Pagos').length, e.filas('Eventos').length, e.estado.mails.length], [pagos, ev, mails]);
  });
  prueba('el estado consultado desde el retorno concilia con la API aunque el webhook no haya llegado', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5003, r.id);   // el webhook nunca llegó
    const s = e.llamar('status', { id: r.id, token: r.token });
    assert(s.ok && s.reserva.estado === 'Confirmada' && s.reserva.pago === 'Acreditado');
  });
  prueba('pago pendiente / en proceso: no confirma y extiende el bloqueo', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5004, r.id, { status: 'in_process', status_detail: 'pending_contingency' });
    assert.strictEqual(e.webhook(5004).resultado, 'Pendiente');
    const x = e.reserva(r.id);
    assert(x.estado === 'Pendiente' && x.pago === 'Pendiente');
    assert(Date.parse(x.vence) > e.ahora() + 20 * H, 'el bloqueo debía extenderse mientras el pago está en proceso');
    e.pago(5004, r.id, { status: 'approved' });
    assert.strictEqual(e.webhook(5004).resultado, 'confirmada');
  });
  prueba('pago rechazado: queda Pendiente/Rechazado y se puede reintentar sin un segundo cobro ni reserva', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5005, r.id, { status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' });
    assert.strictEqual(e.webhook(5005).resultado, 'Rechazado');
    const x = e.reserva(r.id);
    assert(x.estado === 'Pendiente' && x.pago === 'Rechazado');
    const reintento = e.llamar('checkout', { id: r.id, token: r.token, medio: 'mercadopago' });
    assert(reintento.ok && reintento.checkout.url === r.checkout.url, 'reutiliza la misma preferencia');
    assert.strictEqual(e.estado.mp.preferencias.size, 1);
    assert.strictEqual(e.filas('Reservas').length, 1);
  });
  prueba('un pago que no coincide (importe, moneda, cuenta, ambiente) no confirma nada', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5006, r.id, { transaction_amount: 1 });
    assert.strictEqual(e.webhook(5006).resultado, 'invalido');
    e.pago(5007, r.id, { collector_id: 123 });
    assert.strictEqual(e.webhook(5007).resultado, 'invalido');
    e.pago(5008, r.id, { live_mode: true });
    assert.strictEqual(e.webhook(5008).resultado, 'invalido');
    e.pago(5009, r.id, { currency_id: 'USD' });
    assert.strictEqual(e.webhook(5009).resultado, 'invalido');
    assert.strictEqual(e.reserva(r.id).estado, 'Pendiente');
  });
  prueba('webhook sin clave válida o sobre otro tipo de evento se ignora; pagos de otra referencia no afectan', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5010, r.id);
    assert.strictEqual(e.webhook(5010, { k: 'mala' }).ok, false);
    assert.strictEqual(e.reserva(r.id).estado, 'Pendiente');
    assert(e.webhook(5010, { tipo: 'merchant_order' }).ignorado);
    e.pago(5011, 'R-NOEXISTE');
    assert.strictEqual(e.webhook(5011).resultado, 'sin_reserva');
  });
  prueba('segundo pago aprobado para la misma reserva: se registra como Duplicado, sin confirmar de nuevo ni reembolso automático', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5012, r.id); e.webhook(5012);
    e.pago(5013, r.id); const w = e.webhook(5013);
    assert.strictEqual(w.resultado, 'duplicado');
    assert.strictEqual(e.filas('Pagos').filter(p => p.estado === 'Acreditado').length, 1);
    assert.strictEqual(e.filas('Creditos').length, 0);
    assert(!e.estado.fetches.some(f => /refund/.test(f.ruta)), 'no debe haber reembolsos automáticos');
  });
  prueba('pago tardío: si el horario sigue libre confirma; si ya lo tomaron queda en Revisión de Chhari', () => {
    const e = crearEntorno();
    const a = reservar(e, { medio: 'mercadopago' });
    e.avanzar(40 * 60000);                                   // venció el checkout (30 min)
    e.ctx.conLock_(() => e.ctx.vencerCaducadas_());
    assert.strictEqual(e.reserva(a.id).estado, 'Vencida');
    e.pago(5014, a.id); e.webhook(5014);
    assert.strictEqual(e.reserva(a.id).estado, 'Confirmada');
    // segundo caso: otra persona tomó el lugar
    const e2 = crearEntorno();
    const b = reservar(e2, { medio: 'mercadopago' });
    e2.avanzar(40 * 60000);
    const c = e2.llamar('reserve', e2.datos({ fecha: b.fecha, hora: b.hora, tel: '351 444 4444', mail: 'c@c.com', medio: 'transferencia' }));
    assert(c.ok);
    e2.pago(5015, b.id); e2.webhook(5015);
    const x = e2.reserva(b.id);
    assert.strictEqual(x.estado, 'Revisión');
    assert.strictEqual(x.pago, 'Acreditado');
    assert.strictEqual(e2.reserva(c.id).estado, 'Pendiente', 'la otra reserva conserva su lugar');
    assert(e2.estado.mails.some(m => m.subject.includes('Revisión')), 'se avisa a Chhari');
  });
  prueba('sin credenciales configuradas Mercado Pago no se ofrece como cobro ficticio', () => {
    const e = crearEntorno({ mp: false });
    assert.strictEqual(e.get({ action: 'catalogo' }).mercadoPago, false);
    const r = reservar(e, { medio: 'mercadopago' });
    assert(!r.ok && r.error === 'mp_no_configurado');
    assert.strictEqual(e.reserva(e.filas('Reservas')[0].id).estado, 'Vencida', 'no deja el lugar bloqueado');
  });
  prueba('falla de Mercado Pago al crear la preferencia: libera el horario', () => {
    const e = crearEntorno();
    e.estado.mp.falloPreferencia = true;
    const r = reservar(e, { medio: 'mercadopago' });
    assert(!r.ok && r.error === 'mp_error');
    const d = e.get({ action: 'availability', servicio: 'rusa', desde: r.fecha, hasta: r.fecha }).fechas[r.fecha];
    assert(d.includes(r.hora));
  });
  prueba('conciliación programada confirma pagos cuyo aviso nunca llegó', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' });
    e.pago(5016, r.id);
    e.ctx.mantenimientoPeriodico();
    assert.strictEqual(e.reserva(r.id).estado, 'Confirmada');
  });
}

grupo('Enlace privado y cancelación');
{
  prueba('el enlace no autoriza con otro token, id ajeno ni datos de contacto', () => {
    const e = crearEntorno();
    const a = reservar(e), b = reservar(e, { tel: '351 888 8888', mail: 'b@b.com' }, 6, 3);
    assert.strictEqual(e.llamar('status', { id: a.id, token: b.token }).error, 'no_autorizado');
    assert.strictEqual(e.llamar('status', { id: a.id, token: 'x' }).error, 'no_autorizado');
    assert.strictEqual(e.llamar('status', { id: 'R-NO', token: a.token }).error, 'no_autorizado');
    const s = JSON.stringify(e.llamar('status', { id: a.id, token: a.token }));
    assert(!/token_hash|luz@correo|351 555|whatsapp_wa/.test(s), 'la vista no debe incluir datos sensibles');
  });
  prueba('abrir/consultar nunca cancela; hace falta confirmación explícita', () => {
    const e = crearEntorno();
    const r = reservar(e);
    e.llamar('status', { id: r.id, token: r.token });
    assert.strictEqual(e.reserva(r.id).estado, 'Pendiente');
    assert.strictEqual(e.llamar('cancel', { id: r.id, token: r.token }).error, 'confirmar');
    assert.strictEqual(e.llamar('cancel', { id: r.id, token: r.token, confirmar: 'true' }).error, 'confirmar');
    assert.strictEqual(e.reserva(r.id).estado, 'Pendiente');
  });
  prueba('límite de 72 h inclusive: a 72:00 se puede, a 71:59 no', () => {
    const e = crearEntorno();
    const r = reservar(e, {}, 8);
    e.ctx.confirmarTransferencia_(r.id);
    aHorasDelInicio(e, r, 71 + 59 / 60);
    const no = e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    assert(!no.ok && no.error === 'fuera_de_plazo' && no.politica === 'reprogramar_con_chhari');
    assert.strictEqual(e.reserva(r.id).estado, 'Confirmada');
    aHorasDelInicio(e, r, 72);
    const si = e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    assert(si.ok && si.reserva.estado === 'Cancelada' && si.liberado, JSON.stringify(si));
  });
  prueba('entre 72 y 24 h → reprogramar con Chhari; menos de 24 h → contactar; no se cancela online', () => {
    const e = crearEntorno();
    const r = reservar(e, {}, 8); e.ctx.confirmarTransferencia_(r.id);
    aHorasDelInicio(e, r, 48);
    assert.strictEqual(e.llamar('cancel', { id: r.id, token: r.token, confirmar: true }).politica, 'reprogramar_con_chhari');
    assert.strictEqual(e.llamar('status', { id: r.id, token: r.token }).reserva.politica, 'reprogramar_con_chhari');
    aHorasDelInicio(e, r, 5);
    assert.strictEqual(e.llamar('cancel', { id: r.id, token: r.token, confirmar: true }).politica, 'contactar_chhari');
    assert.strictEqual(e.reserva(r.id).estado, 'Confirmada');
  });
  prueba('cancelar libera el horario y conserva la seña ACREDITADA como un único crédito (idempotente)', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' }, 8);
    e.pago(6001, r.id); e.webhook(6001);
    const c1 = e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    assert(c1.ok && c1.credito.monto === 10000, JSON.stringify(c1));
    const c2 = e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    assert(c2.ok && c2.yaCancelada);
    assert.strictEqual(e.filas('Creditos').length, 1, 'un solo crédito por pago de origen');
    assert.strictEqual(e.filas('Creditos')[0].estado, 'Disponible');
    assert.strictEqual(e.filas('Creditos')[0].origen_pago, '6001');
    const d = e.get({ action: 'availability', servicio: 'rusa', desde: r.fecha, hasta: r.fecha }).fechas[r.fecha];
    assert(d.includes(r.hora), 'el horario debe quedar libre');
    assert(!e.estado.fetches.some(f => /refund|payments\/6001\/refunds/.test(f.ruta)), 'sin reembolso automático');
    assert.strictEqual(mailsDe(e, 'Cancelaste').length, 1);
  });
  prueba('una reserva sin seña acreditada no genera crédito', () => {
    const e = crearEntorno();
    const r = reservar(e, {}, 8);
    const c = e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    assert(c.ok && c.credito === null && c.reserva.estado === 'Cancelada');
    assert.strictEqual(e.filas('Creditos').length, 0);
  });
  prueba('webhook o retorno posterior a la cancelación no reactiva el turno; el pago tardío queda como crédito', () => {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' }, 8);
    e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    e.pago(6002, r.id); e.webhook(6002); e.webhook(6002);
    const x = e.reserva(r.id);
    assert(x.estado === 'Cancelada' && x.pago === 'Acreditado');
    assert.strictEqual(e.filas('Creditos').length, 1);
    assert.strictEqual(e.llamar('status', { id: r.id, token: r.token }).reserva.estado, 'Cancelada');
  });
}

grupo('Seña a favor (crédito) y reprogramación');
{
  function conCredito() {
    const e = crearEntorno();
    const r = reservar(e, { medio: 'mercadopago' }, 8);
    e.pago(7001, r.id); e.webhook(7001);
    e.llamar('cancel', { id: r.id, token: r.token, confirmar: true });
    return { e, r };
  }
  prueba('el estado muestra la seña a favor solo a quien tiene el token', () => {
    const { e, r } = conCredito();
    const s = e.llamar('status', { id: r.id, token: r.token });
    assert.strictEqual(s.credito.monto, 10000);
    assert.strictEqual(e.llamar('status', { id: r.id, token: 'otro' }).credito, undefined);
  });
  prueba('se usa en una nueva cita: cubre la seña, confirma sin cobrar y se aplica una sola vez', () => {
    const { e, r } = conCredito();
    const nueva = reservar(e, { medio: 'transferencia', credito: { id: r.id, token: r.token } }, 9, 2);
    assert(nueva.ok && nueva.reserva.estado === 'Confirmada' && nueva.reserva.medio === 'credito' && nueva.reserva.porPagar === 0, JSON.stringify(nueva));
    assert.strictEqual(e.filas('Creditos')[0].estado, 'Aplicado');
    assert.strictEqual(e.filas('Creditos')[0].aplicado_en, nueva.id);
    const otra = e.llamar('reserve', e.datos({ fecha: '2026-11-03', hora: '10:00', credito: { id: r.id, token: r.token } }));
    assert.strictEqual(otra.error, 'credito', 'segunda vez: sin crédito');
    assert.strictEqual(mailsDe(e, 'Turno confirmado').length, 2, 'un mail por reserva confirmada');
  });
  prueba('no se puede usar con otro WhatsApp ni con un token ajeno', () => {
    const { e, r } = conCredito();
    const ajena = e.llamar('reserve', e.datos({ fecha: '2026-11-03', hora: '10:00', tel: '351 000 0000', credito: { id: r.id, token: r.token } }));
    assert.strictEqual(ajena.error, 'credito');
    const falso = e.llamar('reserve', e.datos({ fecha: '2026-11-03', hora: '10:00', credito: { id: r.id, token: 'falso' } }));
    assert.strictEqual(falso.error, 'credito');
    assert.strictEqual(e.filas('Creditos')[0].estado, 'Disponible');
  });
  prueba('si la nueva cita con crédito se cancela con ≥72 h, el crédito vuelve a estar disponible (sin duplicarse)', () => {
    const { e, r } = conCredito();
    const nueva = reservar(e, { credito: { id: r.id, token: r.token } }, 9, 2);
    const c = e.llamar('cancel', { id: nueva.id, token: nueva.token, confirmar: true });
    assert(c.ok);
    assert.strictEqual(e.filas('Creditos').length, 1);
    assert.strictEqual(e.filas('Creditos')[0].estado, 'Revertido');
    const otra = reservar(e, { credito: { id: r.id, token: r.token } }, 12, 4);
    assert(otra.ok && otra.reserva.estado === 'Confirmada');
  });
  prueba('crédito parcial (seña mayor al crédito): cobra solo la diferencia y revierte si no se paga', () => {
    const { e, r } = conCredito();
    e.ctx.CFG.SENA = 12000;
    const nueva = reservar(e, { medio: 'transferencia', credito: { id: r.id, token: r.token } }, 9, 2);
    assert(nueva.ok && nueva.reserva.estado === 'Pendiente' && nueva.reserva.credito === 10000 && nueva.reserva.porPagar === 2000, JSON.stringify(nueva.reserva));
    assert.strictEqual(nueva.transferencia.monto, 2000);
    e.avanzar(13 * H);
    e.ctx.conLock_(() => e.ctx.vencerCaducadas_());
    assert.strictEqual(e.filas('Creditos')[0].estado, 'Revertido');
  });
  prueba('reprogramación administrada por Chhari: conserva pago y deja trazabilidad', () => {
    const e = crearEntorno();
    const r = reservar(e, {}, 8); e.ctx.confirmarTransferencia_(r.id);
    const ok = e.ctx.reprogramarAdmin_(r.id, '2026-11-04', '15:00');
    assert(ok.ok);
    const x = e.reserva(r.id);
    assert(x.fecha === '2026-11-04' && x.hora === '15:00' && x.pago === 'Acreditado' && x.estado === 'Confirmada');
    assert(x.nota.includes('Reprogramada por Chhari'));
    assert.strictEqual(e.ctx.reprogramarAdmin_(r.id, '2026-11-08', '15:00').error, 'horario');   // domingo
    const otra = reservar(e, { fecha: '2026-11-05', hora: '10:00', tel: '351 333 3333', mail: 'z@z.com' });
    assert.strictEqual(e.ctx.reprogramarAdmin_(r.id, '2026-11-05', '10:00').error, 'ocupado');
    assert(e.filas('Eventos').some(v => v.tipo === 'reprogramada'));
  });
}

grupo('Planilla y datos');
{
  prueba('la planilla guarda todo como texto (fechas y horas no se transforman) y mantiene la fórmula de WhatsApp', () => {
    const e = crearEntorno();
    const r = reservar(e);
    e.ctx.confirmarTransferencia_(r.id);
    const f = e.filas('Reservas')[0];
    assert.strictEqual(typeof f.hora, 'string');
    assert(/^\d{2}:\d{2}$/.test(f.hora) && /^\d{4}-\d{2}-\d{2}$/.test(f.fecha));
    assert.strictEqual(f.enviar_whatsapp, 'Enviar por WhatsApp');
  });
  prueba('registra la clienta y los eventos de cada transición', () => {
    const e = crearEntorno();
    const r = reservar(e); e.ctx.confirmarTransferencia_(r.id);
    const tipos = e.filas('Eventos').map(v => v.tipo);
    assert(tipos.includes('creada') && tipos.includes('transferencia_confirmada'));
    const cl = e.estado.libros.HOJA_DE_PRUEBA.getSheetByName('Clientas');
    assert(cl && cl.getLastRow() === 2);
  });
}

const fallos = resultados.filter(r => !r[0]);
console.log('\n' + (resultados.length - fallos.length) + ' de ' + resultados.length + ' pruebas pasaron.');
if (fallos.length) { console.log('\nFALLARON:'); fallos.forEach(f => console.log(' - ' + f[1] + '\n   ' + (f[2].stack || f[2]).split('\n').slice(0, 4).join('\n   '))); process.exit(1); }
