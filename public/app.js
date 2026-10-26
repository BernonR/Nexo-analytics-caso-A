const $ = id => document.getElementById(id);
const pages = {
  inicio: ['Tu resumen', 'Una vista rápida de tu espacio.', ['Productos disponibles', 'Últimos movimientos', 'Tu perfil']],
  perfil: ['Tu perfil', 'La información de tu cuenta de demostración.', ['Datos del usuario', 'Preferencias de contacto', 'Seguridad']],
  productos: ['Tus productos', 'Explorá los productos ficticios del portal.', ['Cuenta principal', 'Cuenta de ahorro', 'Servicios']],
  movimientos: ['Movimientos', 'Consultá tu actividad de demostración.', ['Ingreso de prueba', 'Consulta reciente', 'Actualización de perfil']],
  configuracion: ['Configuración', 'Personalizá tu experiencia.', ['Notificaciones', 'Idioma', 'Privacidad']],
  ayuda: ['Estamos para ayudarte', 'Encontrá orientación para usar el portal.', ['Preguntas frecuentes', 'Guías de uso', 'Contacto']],
};
async function post(path, data) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}
async function visit(section) {
  try {
    await post('/api/section', { section });
    const [title, description, cards] = pages[section];
    $('title').textContent = title; $('description').textContent = description; $('section-label').textContent = section;
    $('cards').replaceChildren(...cards.map(text => { const div = document.createElement('div'); div.textContent = text; return div; }));
    for (const button of $('navigation').children) button.setAttribute('aria-current', String(button.dataset.section === section));
    $('status').textContent = '';
  } catch (error) { $('status').textContent = error.message; }
}
for (const section of Object.keys(pages)) {
  const button = document.createElement('button'); button.textContent = section; button.dataset.section = section;
  button.onclick = () => visit(section); $('navigation').append(button);
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  try {
    const result = await post('/api/login', { user: $('user').value });
    $('identity').textContent = result.user; $('session').textContent = 'Sesión: ' + result.session;
    $('login').hidden = true; $('workspace').hidden = false; $('logout').hidden = false;
    await visit('inicio');
  } catch (error) { $('status').textContent = error.message; }
};
$('logout').onclick = async () => {
  try { await post('/api/logout', {}); location.reload(); }
  catch (error) { $('status').textContent = error.message; }
};
