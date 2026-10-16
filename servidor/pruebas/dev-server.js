'use strict';
/**
 * Servidor de PRUEBA LOCAL: sirve el sitio y reemplaza al servidor de Google y a Mercado Pago con el entorno simulado.
 * Ejecuta el mismo código de servidor/*.gs que se publica en Google. No cobra, no envía mails, no toca la planilla real.
 *   node servidor/pruebas/dev-server.js [puerto]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { crearEntorno } = require('./entorno');

const RAIZ = path.resolve(__dirname, '..', '..');
const PUERTO = Number(process.argv[2]) || 8780;
const ORIGEN = 'http://localhost:' + PUERTO;
const env = crearEntorno();
env.estado.mp.base = ORIGEN + '/mp-sandbox/';
let offset = 0, idPago = 9000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

function leerCuerpo(req) { return new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); }); }
function json(res, obj, code = 200) { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }

http.createServer(async (req, res) => {
  env.estado.ahora = Date.now() + offset; env.ctx.reiniciarCache_();
  const url = new URL(req.url, ORIGEN);
  try {
    if (url.pathname === '/exec') {
      const parametros = Object.fromEntries(url.searchParams);
      if (req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        const r = env.ctx.doPost({ parameter: parametros, postData: { contents: cuerpo } });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(r.getContent());
      }
      const r = env.ctx.doGet({ parameter: parametros });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(r.getContent());
    }
    if (url.pathname.startsWith('/mp-sandbox/')) {                                         // Checkout Pro simulado
      const pref = url.searchParams.get('pref_id'), p = env.estado.mp.preferencias.get(pref);
      if (!p) { res.writeHead(404); return res.end('preferencia inexistente'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Mercado Pago (simulado)</title>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:0 16px"><h2>Mercado Pago · entorno de prueba</h2>
<p>Esto es una simulación local. No se cobra nada.</p><p><b>${p.items[0].title}</b><br>Monto: $${p.items[0].unit_price} ${p.items[0].currency_id}<br>Referencia: ${p.external_reference}</p>
${['approved|Pagar (aprobado)', 'in_process|Pago en proceso', 'rejected|Pago rechazado'].map(x => { const [k, t] = x.split('|'); return `<p><a style="display:block;padding:14px;background:#009ee3;color:#fff;text-align:center;border-radius:8px;text-decoration:none" href="/__dev/pagar?pref=${pref}&resultado=${k}">${t}</a></p>`; }).join('')}
<p><a href="${p.back_urls.failure.replace('https://chharichhula.github.io/chharichhula-reservas/', ORIGEN + '/')}">Volver sin pagar</a></p>`);
    }
    if (url.pathname === '/__dev/pagar') {                                                 // la persona pagó (o no) en Mercado Pago
      const p = env.estado.mp.preferencias.get(url.searchParams.get('pref')), st = url.searchParams.get('resultado');
      const id = ++idPago;
      env.pago(id, p.external_reference, { status: st, status_detail: st === 'approved' ? 'accredited' : st, transaction_amount: p.items[0].unit_price });
      if (url.searchParams.get('sinwebhook') !== '1') env.webhook(id);                  // sinwebhook=1 simula que el aviso nunca llega
      const back = st === 'approved' ? p.back_urls.success : st === 'in_process' ? p.back_urls.pending : p.back_urls.failure;
      const dest = back.replace('https://chharichhula.github.io/chharichhula-reservas/', ORIGEN + '/') + '&collection_status=' + (st === 'approved' ? 'approved' : st) + '&payment_id=' + id + '&external_reference=' + p.external_reference;
      res.writeHead(302, { Location: dest }); return res.end();
    }
    if (url.pathname === '/__dev/confirmar') return json(res, env.ctx.confirmarTransferencia_(url.searchParams.get('id')));
    if (url.pathname === '/__dev/tiempo') { offset += Number(url.searchParams.get('h') || 0) * 3600000; env.estado.ahora = Date.now() + offset; env.ctx.conLock_(() => env.ctx.vencerCaducadas_()); return json(res, { ahora: new Date(env.estado.ahora).toISOString() }); }
    if (url.pathname === '/__dev/enlace') { const id = url.searchParams.get('id'); return json(res, { enlace: ORIGEN + '/#gestionar=' + id + '.' + env.ctx.tokenDe_(id) }); }
    if (url.pathname === '/__dev/mails') return json(res, env.estado.mails.map(m => ({ para: m.to, asunto: m.subject, texto: m.body })));
    if (url.pathname === '/__dev/mailhtml') { const m = env.estado.mails[Number(url.searchParams.get('i') || env.estado.mails.length - 1)]; res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(m ? m.htmlBody : 'sin mails'); }
    if (url.pathname === '/__dev/tabla') return json(res, env.filas(url.searchParams.get('n') || 'Reservas').map(r => { const o = Object.assign({}, r); delete o.token_hash; return o; }));
    if (url.pathname === '/__dev/mpfalla') { env.estado.mp.falloPreferencia = url.searchParams.get('v') === '1'; return json(res, { ok: true }); }
    // estático
    let ruta = decodeURIComponent(url.pathname); if (ruta === '/') ruta = '/index.html';
    const archivo = path.join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ) || /[\\/]servidor[\\/]/.test(archivo) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end('no encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (ruta === '/config.js') return res.end(fs.readFileSync(archivo, 'utf8').replace(/api: "[^"]*"/, 'api: "' + ORIGEN + '/exec"'));   // en local, el sitio habla con el servidor simulado
    fs.createReadStream(archivo).pipe(res);
  } catch (e) { console.error(e); json(res, { ok: false, error: 'dev', mensaje: String(e.message || e) }, 500); }
}).listen(PUERTO, () => console.log('Sitio + servidor simulado en ' + ORIGEN));
