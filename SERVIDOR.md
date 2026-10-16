# Servidor de reservas · alojamiento, secretos y conexión

GitHub Pages sigue siendo el sitio visible (solo archivos estáticos). Todo lo que necesita un servidor privado vive en **Google Apps Script**, en la cuenta de Chhari, conectado a su planilla. No hay ningún secreto en este repositorio.

```
Navegador (GitHub Pages)  ──►  Apps Script "aplicación web" (/exec)  ──►  Planilla de Google (Reservas, Pagos, Créditos, Eventos, Bloqueos, Clientas)
                                      │   ▲
                                      ▼   │  notificaciones (webhook) + consultas con Access Token privado
                                 Mercado Pago (Checkout Pro)
```

| Qué | Dónde está |
|---|---|
| Código del servidor | `servidor/*.gs` (fuente) y `servidor/dist/Codigo-completo.gs` (el mismo código en un solo archivo para pegar) |
| Manifiesto | `servidor/dist-manifest.json` |
| Pruebas | `servidor/pruebas/run.js` (`node servidor/pruebas/run.js`) |
| Probar todo en tu compu | `node servidor/pruebas/dev-server.js` → http://localhost:8780/?preview (servidor y Mercado Pago **simulados**) |

## Por qué Apps Script y qué límites tiene (sin letra chica)
- Ya existe en la cuenta de Chhari, no cuesta nada y escribe directo en la planilla que ella usa.
- **Reservas simultáneas:** cada reserva lee la agenda, decide y escribe dentro de un bloqueo de Google (`LockService`). Dos personas no pueden ocupar horarios que se superponen.
- **Firma del webhook:** Apps Script **no permite leer los encabezados HTTP**, así que no puede validar `x-signature`. Se compensa así: (1) el aviso solo trae un ID de pago; (2) el servidor consulta ese pago a la API de Mercado Pago con el Access Token privado y verifica referencia, importe, moneda, cuenta receptora y ambiente (prueba/producción); (3) la URL del aviso lleva una clave secreta propia; (4) la web consulta al volver del pago y una tarea cada 5 minutos concilia. Nadie puede confirmar un turno “avisando” al servidor: solo cuenta lo que Mercado Pago responde.
- **Aviso con redirección:** Apps Script responde a los POST con una redirección (HTTP 302). Mercado Pago puede registrarlo como “reintentar”. No genera duplicados (todo es idempotente) y la conciliación cubre cualquier aviso perdido. Si en el panel de Mercado Pago ves avisos marcados como fallidos pero los turnos se confirman, es esto.
- **Cuota de mails:** una cuenta gratuita de Google envía hasta 100 destinatarios por día (cada mail con copia a Chari cuenta 2). Alcanza para unas 15-30 reservas por día. Con más volumen conviene Google Workspace.
- Si más adelante querés validar la firma `x-signature`, se puede poner un “Cloudflare Worker” gratuito delante que la verifique y reenvíe al Apps Script. No hace falta para empezar.

## Puesta en marcha (una sola vez) · pasos de María
1. Abrí el proyecto de Apps Script “Chhari Chhula · Reservas” (en la planilla: **Extensiones → Apps Script**).
2. Reemplazá el contenido de `Code.gs` por el de **`servidor/dist/Codigo-completo.gs`** (copiá la versión anterior antes, por las dudas). En **Configuración del proyecto → Mostrar el archivo de manifiesto** pegá `servidor/dist-manifest.json` en `appsscript.json`.
3. **Configuración del proyecto → Propiedades de la secuencia de comandos** (es el panel seguro; nada de esto va a GitHub ni al chat):

| Propiedad | Valor |
|---|---|
| `SHEET_ID` | `1MeZighioCB57TN3viINQvwhEzWOSAuKh_fisfOpYCeY` (planilla “Chhari · Clientas y turnos”) |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago. **Primero el de PRUEBA** (empieza con `TEST-`) |
| `MP_MODO` | `prueba` (más adelante `produccion`) |
| `MP_COLLECTOR_ID` | se completa solo al ejecutar `mercadoPagoConfigurar` |
| `MP_WEBHOOK_KEY`, `TOKEN_KEY` | se generan solas; no las cambies ni las compartas |
| `WEBAPP_URL` | opcional: la URL `/exec` si el sistema no la detecta |

4. Ejecutá **`instalar`** (menú “Ejecutar”). Google pide autorizar permisos (planilla, mails, conexión externa): aceptá. Crea las hojas y programa la tarea de cada 5 minutos.
5. **Implementar → Nueva implementación → Aplicación web**: *Ejecutar como* “Yo”, *Quién tiene acceso* “Cualquier usuario”. Copiá la URL que termina en `/exec`. **Es una implementación nueva a propósito**: la anterior (versión 4) sigue funcionando para el sitio actual hasta que se publique el diseño nuevo.
6. Pasale esa URL a Claude (o editá `api:` en `config.js`) para conectar el sitio.

### Mercado Pago (cuenta de Chhari)
1. Entrá a https://www.mercadopago.com.ar/developers → **Tus integraciones → Crear aplicación** → producto **Checkout Pro**.
2. En **Credenciales de prueba** copiá el Access Token y guardalo en `MP_ACCESS_TOKEN` (paso 3 de arriba). Ejecutá `mercadoPagoConfigurar` (guarda el ID de la cuenta receptora y genera la clave del aviso).
3. En la aplicación, **Notificaciones → Webhooks**: modo prueba, evento **Pagos**, URL:
   `https://script.google.com/macros/s/…/exec?action=mp_webhook&k=EL_VALOR_DE_MP_WEBHOOK_KEY`
   (el valor de `MP_WEBHOOK_KEY` se ve en las propiedades del script).
4. Probá con **usuarios de prueba** y tarjetas de prueba de Mercado Pago (https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards). No se cobra dinero real.
5. Cuando todo funcione: reemplazá `MP_ACCESS_TOKEN` por el de **producción**, `MP_MODO` por `produccion`, volvé a ejecutar `mercadoPagoConfigurar`, y cargá el webhook de producción con la misma URL.

**URLs de retorno** (las envía el servidor en cada pago; no hay que cargarlas en el panel): éxito `…/chharichhula-reservas/?retorno=exito`, pendiente `…?retorno=pendiente`, error `…?retorno=error`. Siempre apuntan al sitio publicado, nunca a localhost.

## Qué guarda la planilla
`Reservas` (agenda y estado de cada turno; la agenda sale de acá), `Pagos` (un registro por pago, ID único), `Creditos` (seña a favor por pago de origen), `Eventos` (historial idempotente), `Bloqueos` (días u horas que Chhari cierra: columnas fecha `AAAA-MM-DD`, desde, hasta, motivo; sin horas = día completo), `Clientas` (ficha y cantidad de turnos). La hoja vieja `Turnos` queda como historial y ya no se escribe.

## Volver a la versión anterior
- **Sitio:** en GitHub, `git revert` del commit de publicación, o `git checkout antes-diseno-final` (etiqueta del sitio anterior, commit `ce7e34f`).
- **Servidor:** en Apps Script, **Implementar → Administrar implementaciones**: la implementación anterior (versión 4) sigue intacta. Basta con volver a poner su URL en `config.js`.
