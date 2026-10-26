# Portal Nexo con analytics en el backend

El portal de Nexo registra un evento al iniciar sesión y otro cada vez que el usuario entra a una sección. Los requests a la API de analytics salen solo del backend, conservan el mismo usuario, canal y sesión durante todo el recorrido, y una falla o una demora de analytics nunca impide navegar.

- **Mapa de dependencias:** [MAPA-DE-DEPENDENCIAS.md](MAPA-DE-DEPENDENCIAS.md)
- **Evidencia del recorrido y de las pruebas:** [EVIDENCIA.md](EVIDENCIA.md) y la carpeta [evidencia/](evidencia/)

## Cómo funciona

1. El navegador llama a `/api/login` o a `/api/section` del propio portal, como antes. El navegador no cambió.
2. El backend (`server.mjs`) responde de inmediato al navegador.
3. Después, sin esperar el resultado, el backend envía el evento a la API con `sendAnalytics()`:
    - login → `POST /{ambiente}/analytics/login` con `{ user, channel, session }`
    - sección → `POST /{ambiente}/analytics/section` con `{ user, channel, session, section }`
4. El resultado de cada envío se escribe en la consola del backend, sin el Bearer.

## Decisiones principales

- **El Bearer queda en el backend.** Se lee del archivo `.env` y solo lo usa `sendAnalytics()`. El navegador recibe únicamente `user` y `session`.
- **La navegación no depende de analytics.** El backend responde antes de enviar el evento y llama a `sendAnalytics()` sin `await`. Si la API tarda o está caída, el usuario no lo nota.
- **Tiempo de espera acotado.** Cada envío se corta a los 3000 ms (`ANALYTICS_TIMEOUT_MS`) con `AbortSignal.timeout`.
- **Errores controlados.** `sendAnalytics()` atrapa todos los errores y los escribe en la consola; nunca interrumpe el portal.
- **Misma identidad en todo el recorrido.** Al iniciar sesión, el backend guarda `user` y `session` (un UUID) en memoria. En cada visita los recupera con la cookie del navegador. Se envía el UUID, nunca la cookie, porque la cookie da acceso a la sesión.
- **Canal como número.** `ANALYTICS_CHANNEL` se convierte a número antes de enviarlo, porque la API rechaza en silencio un canal enviado como texto.
- **Respuesta mínima al navegador.** Solo recibe `user`, `session` y `section`; el estado interno, como la sección actual, queda en el servidor.
- **Visitas, no redibujos.** Volver a perfil después de movimientos genera un evento nuevo. Hacer clic otra vez en la sección que ya está abierta no genera otro.
- **Sin reintentos.** La API no elimina duplicados y un timeout no prueba que el evento se perdió, así que reintentar podría duplicarlo. Queda como pendiente.
- **Sin dependencias externas.** Solo se usan módulos incluidos en Node.js (`node:http`, `fetch`, `AbortSignal`, `node:child_process`).

Cada decisión también está explicada en comentarios dentro de `server.mjs`, junto a la línea que la aplica.

## Archivos

- `server.mjs`: backend del portal, con la configuración de analytics, `sendAnalytics()` y las llamadas en el login y las secciones.
- `public/`: sitio original, sin cambios.
- `scripts/pruebas.mjs`: pruebas contra la API real y contra el propio servidor; genera un reporte por ejecución.
- `.env.example`: configuración de ejemplo, sin credenciales.
- `MAPA-DE-DEPENDENCIAS.md`: insumos, supuestos, preguntas pendientes y plan.
- `EVIDENCIA.md` y `evidencia/`: evidencia del recorrido y reportes de cada ejecución de las pruebas.

## Ejecutar

Requisitos: Node.js 20.6 o superior. No hay que instalar paquetes.

1. Copiá `.env.example` como `.env`.
2. Completá `.env` con los insumos del proveedor: URL base, ambiente (`dev` o `prod`), el Bearer de ese ambiente y su canal web.
3. Ejecutá `npm start`.
4. Abrí http://127.0.0.1:4180, ingresá un usuario ficticio y recorré las secciones.

Cada envío aparece en la consola del backend:

```
[analytics] section HTTP 200 368 ms {"user":"bernon-demo","channel":4001,"session":"…","section":"perfil"}
[analytics] FALLÓ login TimeoutError 3009 ms {…}
[analytics] FALLÓ login ECONNREFUSED 9 ms {…}
```

`HTTP 200` solo indica que la API respondió. Que el evento se guardó se confirma en la consulta de registros.

## Verificar

### Recorrido

1. Con `npm start`, iniciá sesión y visitá inicio, perfil, movimientos y de nuevo perfil.
2. En la consulta de registros del proveedor, filtrá por cliente, ambiente, canal, usuario y la sesión que muestra el sitio.
3. Deben aparecer 5 eventos: 1 login y 4 visitas, con perfil dos veces.

### Pruebas

```
npm run pruebas
```

El script:

- envía a la API real un login y una visita válidos;
- envía tres requests inválidos: canal de otro ambiente, sección no admitida y Bearer incorrecto;
- envía un request a una ruta mal escrita;
- levanta el propio `server.mjs` con analytics apuntando a un servicio que nunca responde, para probar la **demora**;
- lo levanta otra vez apuntando a una dirección sin servicio, para probar **analytics caído**;
- revisa que la respuesta al navegador no contenga el Bearer;
- marca cada comprobación automática como **PASA** o **FALLA** y deja como **VERIFICAR** lo que se confirma en la consulta de registros;
- guarda un reporte nuevo en `evidencia/resultado-pruebas-<fecha>.md`, sin sobrescribir los anteriores, y termina con error si alguna comprobación falla.

Al final imprime un usuario de prueba. En la consulta de registros, filtrando por ese usuario, deben aparecer **solo los 2 eventos válidos**, aunque todos los requests recibieron HTTP 200.

## Pendientes para una implementación real

- **Entrega garantizada:** una cola persistente u outbox con reintentos y un identificador de evento para evitar duplicados. Hoy un evento que falla se registra en la consola y se pierde.
- **Verificación automática:** una API de consulta de registros o un reporte de rechazos del proveedor, en lugar de revisar la página manualmente.
- **Secretos:** guardar el Bearer en un gestor de secretos y definir su rotación.
- **Observabilidad:** métricas de eventos enviados, timeouts y errores, con alertas.
- **Sesiones:** hoy viven en memoria y se pierden al reiniciar el servidor; en producción irían a un almacén compartido.
- **Privacidad:** enviar un identificador seudónimo si el proveedor no debe recibir el nombre de usuario.
- **Pruebas de interfaz:** agregar pruebas de extremo a extremo en el navegador, por ejemplo con Playwright.

## Uso de IA

La solución se desarrolló con apoyo de IA (Claude), paso a paso. Las sugerencias se verificaron contrastando cada request con la documentación de la API, ejecutando el recorrido y las pruebas varias veces, y confirmando en la consulta de registros qué eventos se guardaron realmente.
