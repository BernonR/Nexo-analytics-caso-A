# Evidencia: caso A Nexo

Ambiente DEV, canal web 4001. Horas en Guatemala (UTC−6), salvo las fechas de recepción de la API, que vienen en UTC. Todos los datos son ficticios.

La aceptación de cada evento se comprobó en la página **Registros aceptados** del portal del proveedor, filtrando por cliente, ambiente, canal, usuario y sesión. La respuesta HTTP 200 no se usó como confirmación, porque la API la devuelve también cuando rechaza un evento.

## 1. Recorrido completo desde el portal de Nexo

Recorrido realizado el 26/10/2026 a las 09:29 con `npm start`: inicio de sesión y visitas a inicio, perfil, movimientos y nuevamente perfil.

- **Usuario:** `bernon-demo`
- **Sesión:** `a5b2b84c-acbf-4898-bbf6-77c67850d0fc`

### Consola del backend

```
Portal Nexo: http://127.0.0.1:4180
[analytics] login HTTP 200 616 ms {"user":"bernon-demo","channel":4001,"session":"a5b2b84c-acbf-4898-bbf6-77c67850d0fc"}
[analytics] section HTTP 200 599 ms {"user":"bernon-demo","channel":4001,"session":"a5b2b84c-acbf-4898-bbf6-77c67850d0fc","section":"inicio"}
[analytics] section HTTP 200 368 ms {"user":"bernon-demo","channel":4001,"session":"a5b2b84c-acbf-4898-bbf6-77c67850d0fc","section":"perfil"}
[analytics] section HTTP 200 366 ms {"user":"bernon-demo","channel":4001,"session":"a5b2b84c-acbf-4898-bbf6-77c67850d0fc","section":"movimientos"}
[analytics] section HTTP 200 430 ms {"user":"bernon-demo","channel":4001,"session":"a5b2b84c-acbf-4898-bbf6-77c67850d0fc","section":"perfil"}
```

### Registros aceptados en el portal: 5 eventos

1. **login** · recibido 2026-10-26T15:29:36.187Z · id `41174778-bb08-4a13-9206-3c4c081ac083`
2. **section inicio** · recibido 2026-10-26T15:29:36.192Z · id `a3f16f2d-e365-44e8-b7c1-b41cc41e0dca`
3. **section perfil** · recibido 2026-10-26T15:29:45.797Z · id `5c8df752-7a35-4db0-9cfa-00d4f49fa9fd`
4. **section movimientos** · recibido 2026-10-26T15:29:51.112Z · id `340c0aed-ca6b-424c-8854-e0eb3dd556d5`
5. **section perfil** · recibido 2026-10-26T15:29:57.032Z · id `86ee3cd2-52da-48aa-b644-70fbcf1cd492`

### Qué demuestra

- Los requests los hace el backend: aparecen en la consola del servidor, no en el navegador.
- Los cinco eventos llevan el mismo `user`, `channel` y `session`.
- Volver a perfil después de movimientos generó una visita nueva, como indica la documentación.
- El login y la visita a inicio llegaron con 5 ms de diferencia. La API no garantiza el orden, por eso los eventos se relacionan por usuario y sesión, no por orden de llegada.

## 2. Pruebas automatizadas (`npm run pruebas`)

El script se ejecutó tres veces. Cada ejecución generó su propio reporte en la carpeta `evidencia/`, con el detalle de cada request y la consola del backend.

### Contenido de cada ejecución

- **Requests válidos:** un login y una visita a perfil.
- **Requests inválidos:** canal de otro ambiente (4101 con el Bearer de DEV), sección no admitida (`administracion`) y Bearer incorrecto.
- **Ruta mal escrita:** `/dev/analytics/sections` en vez de `/section`.
- **Demora:** el portal de Nexo con analytics apuntando a un servicio que nunca responde.
- **Analytics caído:** el portal de Nexo con analytics apuntando a una dirección sin servicio.
- **Bearer:** revisión de la respuesta que recibe el navegador.

### Resultado en Registros aceptados

En las tres ejecuciones se enviaron 6 requests a la API real y **todos recibieron HTTP 200**, pero solo se guardaron los 2 válidos:

- **Ejecución 10:07** · usuario `prueba-20261026160755` · reporte `resultado-pruebas-20261026160755.md`
    - Aceptados: login (16:07:54.005Z) y section perfil (16:07:54.416Z), sesión `prueba-20261026160755-valida`.
    - No aparecen: canal de otro ambiente, sección no admitida, Bearer incorrecto, ruta mal escrita.
- **Ejecución 10:16** · usuario `prueba-20261026161639` · reporte `resultado-pruebas-20261026161639.md`
    - Aceptados: login (16:16:37.863Z) y section perfil (16:16:38.222Z), sesión `prueba-20261026161639-valida`.
    - No aparecen: los mismos cuatro inválidos.
- **Ejecución 10:20** · usuario `prueba-20261026162007` · reporte `resultado-pruebas-20261026162007.md`
    - Aceptados: login (16:20:05.686Z) y section perfil (16:20:06.052Z), sesión `prueba-20261026162007-valida`.
    - No aparecen: los mismos cuatro inválidos.

El resultado es idéntico en las tres ejecuciones: un HTTP 200 no confirma que el evento se guardó.

### Demora (ejecución 10:20)

El usuario navegó sin esperar a analytics:

- login → HTTP 200 en 12 ms
- perfil → HTTP 200 en 13 ms
- movimientos → HTTP 200 en 3 ms

El backend cortó cada envío al llegar al tiempo de espera de 3000 ms:

```
[analytics] FALLÓ login TimeoutError 3009 ms
[analytics] FALLÓ section TimeoutError 3009 ms (perfil)
[analytics] FALLÓ section TimeoutError 3006 ms (movimientos)
```

### Analytics caído (ejecución 10:20)

El usuario navegó igual, con HTTP 200 en login, perfil y movimientos. El backend registró la falla sin afectar la navegación:

```
[analytics] FALLÓ login ECONNREFUSED 9 ms
[analytics] FALLÓ section ECONNREFUSED 1 ms (perfil)
[analytics] FALLÓ section ECONNREFUSED 1 ms (movimientos)
```

### El Bearer no llega al navegador

- La respuesta de `/api/login` al navegador contiene solo `user` y `session`.
- La revisión automática confirmó que no contiene el Bearer.
- El navegador solo llama a `/api/login` y `/api/section` del propio portal; los requests a la API de analytics salen del backend.
