/* Cliente del servidor de reservas. Solo habla con la API pública; nunca maneja secretos. */
(() => {
'use strict';
const cfg = window.CHHARI;
let base = cfg.api;
// Para pruebas locales se puede apuntar a otro servidor con ?api=…, pero solo desde localhost.
try {
  const p = new URLSearchParams(location.search).get('api');
  if (p && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) base = p;
} catch (e) { /* sin override */ }

async function pedir(url, opciones) {
  const control = new AbortController(), timer = setTimeout(() => control.abort(), 28000);
  try {
    const r = await fetch(url, Object.assign({ signal: control.signal, redirect: 'follow' }, opciones));
    const j = await r.json();
    return j && typeof j === 'object' ? j : { ok: false, error: 'respuesta' };
  } catch (e) {
    return { ok: false, error: 'red', mensaje: 'No pudimos conectar con la agenda. Revisá tu conexión y probá de nuevo.' };
  } finally { clearTimeout(timer); }
}

const api = {
  base: () => base,
  get(params) { return pedir(base + '?' + new URLSearchParams(params).toString()); },
  // text/plain evita la consulta previa (preflight) que Apps Script no responde
  post(cuerpo) { return pedir(base, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) }); },
  catalogo: () => api.get({ action: 'catalogo' }),
  disponibilidad: (servicio, desde, hasta) => api.get({ action: 'availability', servicio, desde, hasta }),
  reservar: datos => api.post(Object.assign({ action: 'reserve' }, datos)),
  estado: (id, token) => api.post({ action: 'status', id, token }),
  medio: (id, token, medio) => api.post({ action: 'checkout', id, token, medio }),
  cancelar: (id, token) => api.post({ action: 'cancel', id, token, confirmar: true })
};
window.ChhariAPI = api;
})();
