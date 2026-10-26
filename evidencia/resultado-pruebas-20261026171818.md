# Resultado de las pruebas: caso A Nexo

- Fecha: 26/10/2026, 11:18:18 a. m. (Guatemala)
- Ambiente: dev · canal 4001 · timeout 3000 ms
- Usuario de prueba: `prueba-20261026171818` (filtrá por este usuario en Registros aceptados)

## 1. Requests válidos e inválidos contra la API real

La API responde HTTP 200 a todos. La aceptación se confirma en Registros aceptados.

### Válido: login
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4001,"session":"prueba-20261026171818-valida"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 630 ms
- Esperado en Registros aceptados: **aparece**

### Válido: visita a perfil
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4001,"session":"prueba-20261026171818-valida","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 366 ms
- Esperado en Registros aceptados: **aparece**

### Inválido: canal de otro ambiente
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4101,"session":"prueba-20261026171818-canal"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 105 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: sección no admitida
- Request: `POST /dev/analytics/section`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4001,"session":"prueba-20261026171818-seccion","section":"administracion"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 96 ms
- Esperado en Registros aceptados: **no aparece**

### Inválido: Bearer incorrecto
- Request: `POST /dev/analytics/login`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4001,"session":"prueba-20261026171818-bearer"}`
- Bearer: uno incorrecto, a propósito
- Respuesta: HTTP 200 {"message":"Request processed"} · 89 ms
- Esperado en Registros aceptados: **no aparece**

## 2. Ruta no documentada de la API real

### Ruta mal escrita (sections en vez de section), con el timeout configurado
- Request: `POST /dev/analytics/sections`
- Cuerpo: `{"user":"prueba-20261026171818","channel":4001,"session":"prueba-20261026171818-demora","section":"perfil"}`
- Respuesta: HTTP 200 {"message":"Request processed"} · 95 ms
- Esperado en Registros aceptados: **no aparece: la ruta no existe, aunque responda 200**

## 3. Demora dentro del portal: analytics responde muy lento

El usuario navega sin esperar a analytics:
- login → HTTP 200 en 11 ms
- perfil → HTTP 200 en 12 ms
- movimientos → HTTP 200 en 4 ms

Consola del backend (los envíos se cortan al llegar al timeout):
```
Portal Nexo: http://127.0.0.1:4192
[analytics] FALLÓ login TimeoutError 3013 ms {"user":"prueba-20261026171818","channel":4001,"session":"ba2d9489-2da9-4ed7-9ec2-e391a9856628"}
[analytics] FALLÓ section TimeoutError 3002 ms {"user":"prueba-20261026171818","channel":4001,"session":"ba2d9489-2da9-4ed7-9ec2-e391a9856628","section":"perfil"}
[analytics] FALLÓ section TimeoutError 3001 ms {"user":"prueba-20261026171818","channel":4001,"session":"ba2d9489-2da9-4ed7-9ec2-e391a9856628","section":"movimientos"}
```

Veredicto:
- **PASA** · Demora: el usuario navega sin esperar: 3 pantallas con HTTP 200, la más lenta en 12 ms (límite 1000 ms)
- **PASA** · Demora: el backend corta el envío al llegar al timeout: 3 de 3 envíos cortados, el último a los 3013 ms (timeout 3000 ms)

## 4. Analytics caído: no hay servicio en la dirección configurada

El usuario navega igual:
- login → HTTP 200 en 10 ms
- perfil → HTTP 200 en 10 ms
- movimientos → HTTP 200 en 3 ms

Consola del backend:
```
Portal Nexo: http://127.0.0.1:4193
[analytics] FALLÓ login ECONNREFUSED 9 ms {"user":"prueba-20261026171818","channel":4001,"session":"93c46a4f-1e81-4093-aad0-0c74caa7e76a"}
[analytics] FALLÓ section ECONNREFUSED 1 ms {"user":"prueba-20261026171818","channel":4001,"session":"93c46a4f-1e81-4093-aad0-0c74caa7e76a","section":"perfil"}
[analytics] FALLÓ section ECONNREFUSED 2 ms {"user":"prueba-20261026171818","channel":4001,"session":"93c46a4f-1e81-4093-aad0-0c74caa7e76a","section":"movimientos"}
```

Veredicto:
- **PASA** · Analytics caído: el usuario navega igual: login, perfil y movimientos con HTTP 200, 200, 200
- **PASA** · Analytics caído: el backend registra la falla: 3 de 3 envíos registrados como FALLÓ (ECONNREFUSED)

## 5. El Bearer no llega al navegador

- Respuesta de `/api/login` al navegador: `{"user":"prueba-20261026171818","session":"93c46a4f-1e81-4093-aad0-0c74caa7e76a"}`
- **PASA** · El Bearer no llega al navegador: la respuesta del login no contiene el Bearer
- El navegador solo llama a `/api/login` y `/api/section` del propio portal; los requests a la API salen del backend.

## Resumen

- **Comprobaciones automáticas:** 5 pasan, 0 fallan.
- **Pendientes de confirmar en Registros aceptados:** 6. Filtrá por el usuario `prueba-20261026171818`: deben aparecer solo 2 eventos (login y perfil de la sesión `prueba-20261026171818-valida`).
    - **VERIFICAR** · Válido: login: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados debe aparecer (sesión prueba-20261026171818-valida)
    - **VERIFICAR** · Válido: visita a perfil: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados debe aparecer (sesión prueba-20261026171818-valida)
    - **VERIFICAR** · Inválido: canal de otro ambiente: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados no debe aparecer (sesión prueba-20261026171818-canal)
    - **VERIFICAR** · Inválido: sección no admitida: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados no debe aparecer (sesión prueba-20261026171818-seccion)
    - **VERIFICAR** · Inválido: Bearer incorrecto: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados no debe aparecer (sesión prueba-20261026171818-bearer)
    - **VERIFICAR** · Ruta mal escrita (sections en vez de section), con el timeout configurado: respuesta HTTP 200 {"message":"Request processed"}; en Registros aceptados no debe aparecer (sesión prueba-20261026171818-demora)

**Resultado: todas las comprobaciones automáticas pasan.**
