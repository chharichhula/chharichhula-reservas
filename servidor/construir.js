'use strict';
/** Une los .gs en un único archivo para pegar en Apps Script: node servidor/construir.js */
const fs = require('fs'), path = require('path');
const orden = ['Config', 'Util', 'Tabla', 'Agenda', 'Gestion', 'Pagos', 'Mail', 'Api', 'Admin'];
const cab = '/* Chhari Chhula · servidor de reservas. Archivo generado con servidor/construir.js: no editar a mano. */\n';
const salida = cab + orden.map(f => '\n/* ===== ' + f + '.gs ===== */\n' + fs.readFileSync(path.join(__dirname, f + '.gs'), 'utf8')).join('');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'Codigo-completo.gs'), salida);
console.log('dist/Codigo-completo.gs · ' + Math.round(salida.length / 1024) + ' KB');
