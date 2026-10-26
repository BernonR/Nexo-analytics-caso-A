// Pruebas de verificación del caso A. Se ejecuta con: npm run pruebas
// Usa la configuración de .env, muestra todo en la consola y escribe el reporte
// evidencia/resultado-pruebas.md. No requiere paquetes externos.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';

const env = process.env;
const baseUrl = (env.ANALYTICS_BASE_URL || '').replace(/\/+$/, '');
const ambiente = env.ANALYTICS_ENV;
const bearer = env.ANALYTICS_BEARER;
const canal = Number(env.ANALYTICS_CHANNEL);
const timeoutMs = Number(env.ANALYTICS_TIMEOUT_MS || 3000);
const canalOtroAmbiente = { 4001: 4101, 4101: 4001 }[canal] ?? canal + 1;

const marca = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const usuario = `prueba-${marca}`;
const reporte = [];
const anotar = (texto = '') => { console.log(texto); reporte.push(texto); };

// ---------- Parte 1: enviar un request directo a la API ----------
async function enviar(ruta, cuerpo, { token = bearer, espera = 10000 } = {}) {
  const inicio = Date.now();
  try {
    const res = await fetch(`${baseUrl}/${ambiente}/analytics/${ruta}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(espera),
    });
    return `HTTP ${res.status} ${await res.text()} · ${Date.now() - inicio} ms`;
  } catch (error) {
    return `${error.name} después de ${Date.now() - inicio} ms`;
  }
}

async function caso(titulo, ruta, cuerpo, esperado, opciones) {
  const resultado = await enviar(ruta, cuerpo, opciones);
  anotar(`### ${titulo}`);
  anotar(`- Request: \`POST /${ambiente}/analytics/${ruta}\``);
  anotar(`- Cuerpo: \`${JSON.stringify(cuerpo)}\``);
  if (opciones?.token) anotar('- Bearer: uno incorrecto, a propósito');
  anotar(`- Respuesta: ${resultado}`);
  anotar(`- Esperado en Registros aceptados: **${esperado}**`);
  anotar();
}

// ---------- Parte 2: levantar el servidor de Nexo con otra configuración ----------
function levantarNexo(puerto, cambios) {
  const hijo = spawn(process.execPath, ['server.mjs'], { env: { ...env, PORT: String(puerto), ...cambios } });
  const consola = [];
  hijo.stdout.on('data', d => consola.push(...d.toString().trim().split('\n')));
  return new Promise(resolve => {
    hijo.stdout.once('data', () => resolve({
      url: `http://127.0.0.1:${puerto}`,
      consola,
      cerrar: () => hijo.kill(),
    }));
  });
}

async function recorrido(nexo) {
  const tiempos = [];
  let inicio = Date.now();
  const login = await fetch(`${nexo.url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: usuario }) });
  const textoLogin = await login.text();
  tiempos.push(`login → HTTP ${login.status} en ${Date.now() - inicio} ms`);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (const seccion of ['perfil', 'movimientos']) {
    inicio = Date.now();
    const res = await fetch(`${nexo.url}/api/section`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ section: seccion }) });
    tiempos.push(`${seccion} → HTTP ${res.status} en ${Date.now() - inicio} ms`);
  }
  return { tiempos, textoLogin };
}

// ---------- Ejecución ----------
anotar('# Resultado de las pruebas: caso A Nexo');
anotar();
anotar(`- Fecha: ${new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })} (Guatemala)`);
anotar(`- Ambiente: ${ambiente} · canal ${canal} · timeout ${timeoutMs} ms`);
anotar(`- Usuario de prueba: \`${usuario}\` (filtrá por este usuario en Registros aceptados)`);
anotar();

anotar('## 1. Requests válidos e inválidos contra la API real');
anotar();
anotar('La API responde HTTP 200 a todos. La aceptación se confirma en Registros aceptados.');
anotar();
await caso('Válido: login', 'login', { user: usuario, channel: canal, session: `${usuario}-valida` }, 'aparece');
await caso('Válido: visita a perfil', 'section', { user: usuario, channel: canal, session: `${usuario}-valida`, section: 'perfil' }, 'aparece');
await caso('Inválido: canal de otro ambiente', 'login', { user: usuario, channel: canalOtroAmbiente, session: `${usuario}-canal` }, 'no aparece');
await caso('Inválido: sección no admitida', 'section', { user: usuario, channel: canal, session: `${usuario}-seccion`, section: 'administracion' }, 'no aparece');
await caso('Inválido: Bearer incorrecto', 'login', { user: usuario, channel: canal, session: `${usuario}-bearer` }, 'no aparece', { token: 'bearer-incorrecto' });

anotar('## 2. Ruta no documentada de la API real');
anotar();
await caso('Ruta mal escrita (sections en vez de section), con el timeout configurado', 'sections', { user: usuario, channel: canal, session: `${usuario}-demora`, section: 'perfil' }, 'no aparece: la ruta no existe, aunque responda 200', { espera: timeoutMs });

anotar('## 3. Demora dentro del portal: analytics responde muy lento');
anotar();
const lenta = createServer(() => {}).listen(4191, '127.0.0.1'); // acepta la conexión y nunca responde
const nexoLento = await levantarNexo(4192, { ANALYTICS_BASE_URL: 'http://127.0.0.1:4191' });
const conDemora = await recorrido(nexoLento);
await new Promise(r => setTimeout(r, timeoutMs + 500));
nexoLento.cerrar(); lenta.close();
anotar('El usuario navega sin esperar a analytics:');
conDemora.tiempos.forEach(t => anotar(`- ${t}`));
anotar();
anotar('Consola del backend (los envíos se cortan al llegar al timeout):');
anotar('```');
nexoLento.consola.forEach(l => anotar(l));
anotar('```');
anotar();

anotar('## 4. Analytics caído: no hay servicio en la dirección configurada');
anotar();
const nexoCaido = await levantarNexo(4193, { ANALYTICS_BASE_URL: 'http://127.0.0.1:4199' });
const sinServicio = await recorrido(nexoCaido);
await new Promise(r => setTimeout(r, 1000));
nexoCaido.cerrar();
anotar('El usuario navega igual:');
sinServicio.tiempos.forEach(t => anotar(`- ${t}`));
anotar();
anotar('Consola del backend:');
anotar('```');
nexoCaido.consola.forEach(l => anotar(l));
anotar('```');
anotar();

anotar('## 5. El Bearer no llega al navegador');
anotar();
const enLogin = sinServicio.textoLogin.includes(bearer);
anotar(`- Respuesta de \`/api/login\` al navegador: \`${sinServicio.textoLogin}\``);
anotar(`- ¿Contiene el Bearer? **${enLogin ? 'SÍ (error)' : 'No'}**`);
anotar('- El navegador solo llama a `/api/login` y `/api/section` del propio portal; los requests a la API salen del backend.');

await mkdir('evidencia', { recursive: true });
// Cada ejecución crea su propio archivo, con la fecha y hora en el nombre: nunca se sobrescribe uno anterior.
const archivo = `evidencia/resultado-pruebas-${marca}.md`;
await writeFile(archivo, reporte.join('\n') + '\n', { flag: 'wx' });
console.log(`\nReporte guardado en ${archivo}`);
