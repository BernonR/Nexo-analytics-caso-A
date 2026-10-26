import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const sections = ['inicio', 'perfil', 'productos', 'movimientos', 'configuracion', 'ayuda'];
const sessions = new Map();
// Configuración de analytics: se lee del .env y solo existe en el backend.
const analytics = {
  baseUrl: (process.env.ANALYTICS_BASE_URL || '').replace(/\/+$/, ''),
  env: process.env.ANALYTICS_ENV,
  bearer: process.env.ANALYTICS_BEARER,
  channel: Number(process.env.ANALYTICS_CHANNEL),
  timeoutMs: Number(process.env.ANALYTICS_TIMEOUT_MS || 3000),
};

// Envía un evento a la API. Nunca lanza errores: si falla, solo lo anota en la consola.
async function sendAnalytics(kind, body) {
  const url = `${analytics.baseUrl}/${analytics.env}/analytics/${kind}`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${analytics.bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(analytics.timeoutMs),
    });
    console.log('[analytics]', kind, 'HTTP', response.status, `${Date.now() - started} ms`, JSON.stringify(body));
  } catch (error) {
     // Registra la falla sin detener el portal.
    // error.cause?.code da la causa concreta (por ejemplo, ECONNREFUSED si no hay servicio);
    // si no existe, como en un timeout, se usa error.name (TimeoutError).
    console.log('[analytics] FALLÓ', kind, error.cause?.code || error.name, `${Date.now() - started} ms`, JSON.stringify(body));
  } 
}
function json(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
async function input(req) {
  let value = '';
  for await (const chunk of req) { value += chunk; if (value.length > 4096) throw new Error('Cuerpo demasiado grande'); }
  return JSON.parse(value);
}
function sessionFor(req) { return sessions.get(/(?:^|;\s*)nexo=([^;]+)/.exec(req.headers.cookie || '')?.[1]); }

// TODO: integrar analytics en backend. La configuración del proveedor está en process.env.
// Conservá la respuesta de navegación independiente del resultado de telemetría.
export function createNexoServer() { return createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.url === '/api/login' && req.method === 'POST') {
      const data = await input(req);
      if (typeof data.user !== 'string' || !data.user.trim() || data.user.length > 128) return json(res, 400, { error: 'Ingresá un usuario ficticio válido.' });
      const session = { user: data.user.trim(), session: randomUUID() };
      const cookie = randomBytes(24).toString('hex');
      sessions.set(cookie, session);
      res.setHeader('Set-Cookie', `nexo=${cookie}; HttpOnly; SameSite=Strict; Path=/`);
      json(res, 200, session); // 1) primero respondemos al usuario
      sendAnalytics('login', { user: session.user, channel: analytics.channel, session: session.session }); // 2) después el evento
      return;
    }
    if (req.url === '/api/section' && req.method === 'POST') {
      const session = sessionFor(req);
      if (!session) return json(res, 401, { error: 'Iniciá sesión.' });
      const data = await input(req);
      if (!sections.includes(data.section)) return json(res, 400, { error: 'Sección desconocida.' });
      // Es una visita nueva si la sección es distinta de la que ya estaba abierta.
      const isNewVisit = session.currentSection !== data.section;
      session.currentSection = data.section;
      json(res, 200, { user: session.user, session: session.session, section: data.section });
      if (isNewVisit) {
        sendAnalytics('section', { user: session.user, channel: analytics.channel, session: session.session, section: data.section });
      }
      return;
    }
    if (req.url === '/api/logout' && req.method === 'POST') {
      const cookie = /(?:^|;\s*)nexo=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      sessions.delete(cookie);
      res.setHeader('Set-Cookie', 'nexo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return json(res, 200, { ok: true });
    }
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
    if (req.method === 'GET' && files[req.url]) {
      const [file, type] = files[req.url];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
      return res.end(await readFile(join(root, 'public', file)));
    }
    json(res, 404, { error: 'No encontrado' });
  } catch { json(res, 400, { error: 'Solicitud inválida' }); }
}); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createNexoServer().listen(Number(process.env.PORT || 4180), '127.0.0.1', () => console.log('Portal Nexo: http://127.0.0.1:' + (process.env.PORT || 4180)));
}
