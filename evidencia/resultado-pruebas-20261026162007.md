# Resultado de las pruebas: caso A Nexo

- Fecha: 26/10/2026, 10:20:07 a. m. (Guatemala)
- Ambiente: dev · canal 4001 · timeout 3000 ms
- Usuario de prueba: `prueba-20261026162007` (filtrá por este usuario en Registros aceptados)

## 1. Requests válidos e inválidos contra la API real

La API responde HTTP 200 a todos. La aceptación se confirma en Registros aceptados.

### Válido: login
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4001,"session":"prueba-20261026162007-valida"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 626 ms
- Esperado en Registros aceptados: **aparece**

### Válido: visita a perfil
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4001,"session":"prueba-20261026162007-valida","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 357 ms
- Esperado en Registros aceptados: **aparece**

### Inválido: canal de otro ambiente
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4101,"session":"prueba-20261026162007-canal"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 91 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: sección no admitida
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4001,"session":"prueba-20261026162007-seccion","section":"administracion"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 90 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: Bearer incorrecto
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4001,"session":"prueba-20261026162007-bearer"}`
- Bearer: uno incorrecto, a propósito
- Respuesta: HTTP 200 {"message":"Request processed"} · 87 ms
- Esperado en Registros aceptados: **no aparece**

## 2. Ruta no documentada de la API real

### Ruta mal escrita (sections en vez de section), con el timeout configurado
- Request: `POST /dev/analytics/sections`
- Cuerpo: `{"user":"prueba-20261026162007","channel":4001,"session":"prueba-20261026162007-demora","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 89 ms
- Esperado en Registros aceptados: **no aparece: la ruta no existe, aunque responda 200**

## 3. Demora dentro del portal: analytics responde muy lento

El usuario navega sin esperar a analytics:
- login → HTTP 200 en 11 ms
- perfil → HTTP 200 en 13 ms
- movimientos → HTTP 200 en 3 ms

Consola del backend (los envíos se cortan al llegar al timeout):
```
Portal Nexo: http://127.0.0.1:4192
[analytics] FALLÓ login TimeoutError 3009 ms {"user":"prueba-20261026162007","channel":4001,"session":"90d3798a-9a0a-4dda-b29f-de641449a0a6"}
[analytics] FALLÓ section TimeoutError 3009 ms {"user":"prueba-20261026162007","channel":4001,"session":"90d3798a-9a0a-4dda-b29f-de641449a0a6","section":"perfil"}
[analytics] FALLÓ section TimeoutError 3006 ms {"user":"prueba-20261026162007","channel":4001,"session":"90d3798a-9a0a-4dda-b29f-de641449a0a6","section":"movimientos"}
```

## 4. Analytics caído: no hay servicio en la dirección configurada

El usuario navega igual:
- login → HTTP 200 en 10 ms
- perfil → HTTP 200 en 11 ms
- movimientos → HTTP 200 en 2 ms

Consola del backend:
```
Portal Nexo: http://127.0.0.1:4193
[analytics] FALLÓ login ECONNREFUSED 9 ms {"user":"prueba-20261026162007","channel":4001,"session":"ab0d7275-ca3c-4fa9-bee0-efd77f876cf7"}
[analytics] FALLÓ section ECONNREFUSED 1 ms {"user":"prueba-20261026162007","channel":4001,"session":"ab0d7275-ca3c-4fa9-bee0-efd77f876cf7","section":"perfil"}
[analytics] FALLÓ section ECONNREFUSED 1 ms {"user":"prueba-20261026162007","channel":4001,"session":"ab0d7275-ca3c-4fa9-bee0-efd77f876cf7","section":"movimientos"}
```

## 5. El Bearer no llega al navegador

- Respuesta de `/api/login` al navegador: `{"user":"prueba-20261026162007","session":"ab0d7275-ca3c-4fa9-bee0-efd77f876cf7"}`
- ¿Contiene el Bearer? **No**
- El navegador solo llama a `/api/login` y `/api/section` del propio portal; los requests a la API salen del backend.
