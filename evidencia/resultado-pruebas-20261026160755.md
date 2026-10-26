# Resultado de las pruebas: caso A Nexo

- Fecha: 26/10/2026, 10:07:55 a. m. (Guatemala)
- Ambiente: dev · canal 4001 · timeout 3000 ms
- Usuario de prueba: `prueba-20261026160755` (filtrá por este usuario en Registros aceptados)

## 1. Requests válidos e inválidos contra la API real

La API responde HTTP 200 a todos. La aceptación se confirma en Registros aceptados.

### Válido: login
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4001,"session":"prueba-20261026160755-valida"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 713 ms
- Esperado en Registros aceptados: **aparece**

### Válido: visita a perfil
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4001,"session":"prueba-20261026160755-valida","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 379 ms
- Esperado en Registros aceptados: **aparece**

### Inválido: canal de otro ambiente
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4101,"session":"prueba-20261026160755-canal"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 99 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: sección no admitida
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4001,"session":"prueba-20261026160755-seccion","section":"administracion"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 91 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: Bearer incorrecto
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4001,"session":"prueba-20261026160755-bearer"}`
- Bearer: uno incorrecto, a propósito
- Respuesta: HTTP 200 {"message":"Request processed"} · 90 ms
- Esperado en Registros aceptados: **no aparece**

## 2. Demora: ruta no documentada de la API real

### Ruta lenta con el timeout configurado
- Request: `POST /dev/analytics/sections`
- Cuerpo: `{"user":"prueba-20261026160755","channel":4001,"session":"prueba-20261026160755-demora","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 88 ms
- Esperado en Registros aceptados: **no aparece (ruta inexistente)**

## 3. Demora dentro del portal: analytics responde muy lento

El usuario navega sin esperar a analytics:
- login → HTTP 200 en 12 ms
- perfil → HTTP 200 en 13 ms
- movimientos → HTTP 200 en 3 ms

Consola del backend (los envíos se cortan al llegar al timeout):
```
Portal Nexo: http://127.0.0.1:4192
[analytics] FALLÓ login TimeoutError 3012 ms {"user":"prueba-20261026160755","channel":4001,"session":"b3578ee0-b410-4dce-acc4-b5af295253ef"}
[analytics] FALLÓ section TimeoutError 3001 ms {"user":"prueba-20261026160755","channel":4001,"session":"b3578ee0-b410-4dce-acc4-b5af295253ef","section":"perfil"}
[analytics] FALLÓ section TimeoutError 3009 ms {"user":"prueba-20261026160755","channel":4001,"session":"b3578ee0-b410-4dce-acc4-b5af295253ef","section":"movimientos"}
```

## 4. Analytics caído: no hay servicio en la dirección configurada

El usuario navega igual:
- login → HTTP 200 en 10 ms
- perfil → HTTP 200 en 4 ms
- movimientos → HTTP 200 en 3 ms

Consola del backend:
```
Portal Nexo: http://127.0.0.1:4193
[analytics] FALLÓ login TypeError 3 ms {"user":"prueba-20261026160755","channel":4001,"session":"297b524c-97a1-4c10-972c-fbda04c366c8"}
[analytics] FALLÓ section TypeError 0 ms {"user":"prueba-20261026160755","channel":4001,"session":"297b524c-97a1-4c10-972c-fbda04c366c8","section":"perfil"}
[analytics] FALLÓ section TypeError 1 ms {"user":"prueba-20261026160755","channel":4001,"session":"297b524c-97a1-4c10-972c-fbda04c366c8","section":"movimientos"}
```

## 5. El Bearer no llega al navegador

- Respuesta de `/api/login` al navegador: `{"user":"prueba-20261026160755","session":"297b524c-97a1-4c10-972c-fbda04c366c8"}`
- ¿Contiene el Bearer? **No**
- El navegador solo llama a `/api/login` y `/api/section` del propio portal; los requests a la API salen del backend.
