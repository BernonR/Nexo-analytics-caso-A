# Plan de dependencias e insumos: Nexo

Plan preparado antes de modificar el código. Se basa en el proyecto recibido (`server.mjs`, `public/`, `.env.example`), la documentación de Analytics API v1 y la página del caso A en el portal.

## Objetivo

Registrar desde el backend un evento al iniciar sesión y otro por cada entrada a una sección, conservando usuario, canal y sesión, sin que una falla de analytics impida navegar.

## Insumos y dependencias

### 1. Node.js 20.6 o superior, npm y Git
- **Quién lo proporciona:** equipo de desarrollo.
- **Para qué sirve:** ejecutar el portal (`--env-file`, `fetch`, `AbortSignal.timeout`) y entregar el código.
- **Ambiente:** local.
- **Cómo se comprueba:** `node --version` (24.11.0), `npm --version` (11.6.1) y `git --version` (2.51.1).
- **Si falta:** no se puede ejecutar ni entregar el proyecto.

### 2. Proyecto del portal Nexo
- **Quién lo proporciona:** el cliente Nexo.
- **Para qué sirve:** es el sitio donde se integra analytics.
- **Ambiente:** local.
- **Cómo se comprueba:** `npm start` y abrir http://127.0.0.1:4180 sin cambios.
- **Si falta:** se bloquea toda la implementación.

### 3. URL base de la API
- **Quién lo proporciona:** el proveedor de analytics (portal del examen).
- **Para qué sirve:** construir las rutas de los eventos.
- **Ambiente:** la misma para DEV y PROD.
- **Cómo se comprueba:** la documentación indica que es la dirección del portal, sin rutas adicionales.
- **Si falta:** no se puede enviar ningún evento.

### 4. Rutas de los eventos
- **Quién lo proporciona:** el proveedor, en la documentación.
- **Para qué sirve:** `/{env}/analytics/login` para el inicio de sesión y `/{env}/analytics/section` para las visitas.
- **Ambiente:** una ruta por ambiente (`/dev/...` y `/prod/...`).
- **Cómo se comprueba:** contrastar el método (POST) y la URL completa con la documentación.
- **Si falta o está mal escrita:** ese evento no se registra; una ruta no documentada puede quedarse sin responder.

### 5. Bearer
- **Quién lo proporciona:** el proveedor, uno por cliente y por ambiente.
- **Para qué sirve:** autenticar al backend de Nexo ante la API.
- **Ambiente:** distinto para DEV y PROD.
- **Cómo se comprueba:** un evento enviado con él aparece en Registros aceptados.
- **Si falta o es incorrecto:** no se registra ningún evento, y no hay error visible: la API responde 200 y lo rechaza en silencio.

### 6. Canal web
- **Quién lo proporciona:** el proveedor, asociado al Bearer y al ambiente.
- **Para qué sirve:** es el campo `channel` de cada evento.
- **Ambiente:** DEV 4001, PROD 4101.
- **Cómo se comprueba:** el evento aparece en registros con ese canal.
- **Si falta o no coincide con el ambiente:** todos los eventos se rechazan en silencio.

### 7. Contrato del cuerpo del evento
- **Quién lo proporciona:** el proveedor, en la documentación.
- **Para qué sirve:** formar requests válidos con `user`, `channel` (número entero), `session` y, en las visitas, `section`.
- **Ambiente:** igual en ambos.
- **Cómo se comprueba:** revisar los campos enviados en la consola del backend.
- **Si no se respeta:** los eventos se rechazan en silencio.

### 8. Consulta de registros (página Registros aceptados)
- **Quién lo proporciona:** el proveedor, en el portal.
- **Para qué sirve:** confirmar qué eventos se guardaron, porque el HTTP 200 no lo prueba.
- **Ambiente:** filtra por cliente, ambiente, canal, usuario y sesión.
- **Cómo se comprueba:** filtrar por el usuario y la sesión de un recorrido de prueba.
- **Si falta:** no hay forma de verificar el resultado.

### 9. Identidad de usuario y sesión
- **Quién lo proporciona:** el backend de Nexo (login simulado).
- **Para qué sirve:** relacionar el login con las visitas del mismo recorrido.
- **Ambiente:** local.
- **Cómo se comprueba:** `/api/login` devuelve `user` y `session` (UUID), y el servidor los guarda en memoria.
- **Si falta:** los eventos quedan sueltos y no se puede reconstruir el recorrido.

## Información confirmada

- Headers obligatorios: `Authorization: Bearer` y `Content-Type: application/json`. Cuerpo JSON de hasta 16 KiB.
- La API responde siempre HTTP 200 con `{"message":"Request processed"}`, acepte o rechace el evento.
- Un evento se rechaza por credencial incorrecta, ambiente y canal que no coinciden, campos o tipos incorrectos, sección no admitida o JSON inválido. Los rechazados no aparecen en registros y el portal no muestra el motivo.
- Volver a una sección después de otra cuenta como visita nueva; volver a dibujar la misma pantalla no.
- La API no elimina duplicados ni garantiza el orden de llegada. Un timeout no prueba que el evento se perdió.
- Algunas rutas no documentadas pueden demorar en responder.
- El cierre de sesión no tiene endpoint de analytics.
- El `.env.example` recibido traía `ANALYTICS_BASE_URL=http://127.0.0.1:4173`, una dirección local que no corresponde a la API. La correcta se confirmó con la documentación del proveedor.

## Supuestos

- El portal web de Nexo usa el canal **web** del ambiente elegido; el canal mobile no aplica.
- Se envía como `session` el UUID que genera el backend, no la cookie: la cookie da acceso a la sesión y no debe salir del backend.
- Hacer clic en la sección que ya está abierta equivale a volver a dibujarla y no genera otro evento.
- Se trabaja en DEV. Pasar a PROD es cambiar ambiente, Bearer y canal en `.env`.
- Un tiempo de espera de 3 segundos es razonable mientras no exista un SLA de latencia.

## Preguntas pendientes para el proveedor o el cliente

1. ¿Hay una vía para conocer el motivo de un rechazo sin revisar manualmente el portal?
2. ¿Existe una API para consultar registros que permita automatizar la verificación?
3. ¿Cuál es el SLA de latencia, para fijar el timeout con datos?
4. ¿El cliente quiere reintentos? Si es así, ¿cómo se deduplican los eventos?
5. ¿Hay límites de volumen o frecuencia de requests?
6. ¿Cómo y cada cuánto se rotan los Bearer, y quién avisa del cambio?

## Plan de trabajo

1. Verificar las herramientas del ambiente (insumo 1).
2. Crear `.env` a partir de `.env.example` con los insumos 3 a 6 y comprobar que el proyecto original funciona.
3. Ubicar en `server.mjs` los puntos de extensión del login y de las secciones, y de dónde salen `user` y `session`.
4. Escribir en el backend una función que envíe el evento con los headers obligatorios, un tiempo de espera acotado y manejo de errores.
5. Llamarla después de responder al navegador, sin esperar su resultado, y evitar eventos repetidos por volver a dibujar la misma sección.
6. Hacer el recorrido login, inicio, perfil, movimientos y perfil, y confirmarlo en Registros aceptados.
7. Probar un request inválido y una demora.
8. Documentar, publicar en GitHub y entregar.
