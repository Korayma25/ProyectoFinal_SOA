# ProyectoFinal_SOA — Vehículos, Compradores, Ventas y Notificaciones

Arquitectura multicanal de servicios REST con cuatro clientes (Windows Forms, PWA móvil, React y JavaFX), dos
APIs (Java Spring Boot y Python FastAPI), un servicio de notificaciones, NGINX como puerta de entrada,
RabbitMQ como bus de eventos y MySQL como almacenamiento.

> Este archivo no contiene contraseñas ni claves. Los secretos viven en archivos locales que Git ignora
> (ver [Configuración y secretos](#4-configuración-y-secretos)).

## 1. Arquitectura y flujo principal

```
Windows Forms ─┐                         ┌─ API Java de vehículos (A 8086 / B 8087) ── MySQL (vehiculos)
PWA móvil ─────┤                         │
React ─────────┼──► NGINX (8090) ────────┼─ API Python de ventas (FastAPI 8000) ───── MySQL (vehiculos)
JavaFX ────────┘                         │            │ publica evento
                                         └─ Notificaciones (8088) ◄── RabbitMQ (5672) ◄─┘
                                                │ consume y guarda
                                                └── MySQL (tabla notificaciones)
```

1. El usuario inicia sesión en la PWA y obtiene un JWT (`POST /oauth/token`).
2. La PWA registra la venta (`POST /api/ventas`, con `Idempotency-Key`).
3. FastAPI confirma la venta y publica el evento `VENTA_COMPLETADA` en RabbitMQ.
4. El servicio de notificaciones consume el evento y lo guarda en la tabla `notificaciones`.
5. JavaFX consulta `GET /api/notificaciones` y muestra el aviso.

React solo consulta (vehículos disponibles, filtro por marca, ventas e indicadores) y **no registra ventas**.

## 2. Proyectos

| Carpeta | Tecnología | Puerto | Función |
|---|---|---|---|
| `venta-vehiculos-api_security` | Java 17, Spring Boot | 8086 (A) y 8087 (B) | Login OAuth/JWT y vehículos; dos instancias iguales |
| `ventas-api-py-1` | Python, FastAPI | 8000 | Compradores y ventas, idempotencia, publicador RabbitMQ y worker |
| `notificaciones-service` | Java 17, Spring Boot | 8088 | Consumidor de RabbitMQ e historial de avisos |
| `nginx` | NGINX | 8090 | Entrada única REST y balanceo 3:1 de la API Java |
| `monitor-balancer-service` | Java 17, Spring Boot | 8095 | Monitor de estado y reparto de NGINX |
| `AplicacionMovilPWA` | HTML/CSS/JS, Node | 5174 | Login y registro de ventas (único cliente que vende) |
| `AplicacionWebREACT/react-fetch-vehiculos` | React + Vite | 5173 | Consulta de vehículos y ventas |
| `escritorioFX/consultarvehiculojavafx` | JavaFX 21 | — | Vehículos y notificaciones de venta |
| `ConsultaJWT_SOA` | C# Windows Forms (.NET) | — | Administración: crear y listar vehículos y compradores, listar ventas |

## 3. Dependencias

| Herramienta | Versión usada | Para qué |
|---|---|---|
| JDK | 17 o superior (se probó con 25) | APIs Java, notificaciones, monitor y JavaFX |
| Maven | 3.9 | Compilar y ejecutar los proyectos Java |
| Python | 3.11 o superior (se probó con 3.14) | FastAPI |
| Node.js y npm | 20 o superior (se probó con 24) | PWA y React |
| .NET SDK y Visual Studio | .NET con soporte `net10.0-windows` | Windows Forms |
| MySQL / MariaDB (XAMPP) | MariaDB 10.11 | Base de datos `vehiculos` |
| NGINX | 1.30 | Puerta de entrada y balanceo |
| Docker | 29 | RabbitMQ (imagen `rabbitmq:management`) |

Instalación de dependencias de cada proyecto:

```powershell
# FastAPI (entorno virtual)
cd ventas-api-py-1
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt

# PWA y React
cd AplicacionMovilPWA; npm install        # la PWA no tiene dependencias externas
cd AplicacionWebREACT\react-fetch-vehiculos; npm ci
```

Los proyectos Maven descargan sus dependencias al compilar.

## 4. Configuración y secretos

Ningún secreto está en el repositorio. Cada servicio lee su configuración de un lugar propio:

| Servicio | Dónde se configura | Contenido |
|---|---|---|
| API Java de vehículos | `src/main/resources/application.properties` (o `secrets.local.properties`, o variables de entorno) | Clave del JWT, cliente OAuth, clave de integración con ventas, clave de notificaciones |
| FastAPI | `ventas-api-py-1/.env` (plantilla: `.env.example`) | Conexión a MySQL, `JAVA_URL`, `JWT_SECRET`, `VENTAS_SERVICE_KEY`, `NOTIFICACIONES_*`, `RABBITMQ_*` |
| Notificaciones | `src/main/resources/application.properties` y `rabbitmq.properties`, `database.properties` | Clave del servicio, RabbitMQ y base de datos |
| PWA | `AplicacionMovilPWA/.env` | `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_IDAPLI` |
| React | `AplicacionWebREACT/react-fetch-vehiculos/.env` (plantilla: `.env.example`) | `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `API_BASE_URL` |
| Windows Forms | `ConsultaJWT_SOA/ConsultaJWT_SOA/secrets.local.json` | `clientId`, `clientSecret`, `idapli` |
| JavaFX | variable `NOTIFICACIONES_KEY` o `secrets.local.properties` (`notificaciones.key`) | Clave del servicio de notificaciones |

**Valores que deben coincidir entre servicios** (si uno cambia, hay que cambiarlo en todos y volver a iniciar sesión):

- Clave del JWT: `app.security.jwt-secret` (Java) = `JWT_SECRET` (FastAPI).
- Clave de ventas: `app.security.ventas-key` (Java) = `VENTAS_SERVICE_KEY` (FastAPI).
- Clave de notificaciones: Java, notificaciones y FastAPI (`NOTIFICACIONES_KEY`) y el cliente JavaFX.
- Cliente OAuth: Java = PWA = React = Windows Forms.

## 5. Puertos

La guía sugiere 8080/8082/8002/8081/8083. En este equipo esos puertos están ocupados (Oracle en el 8080 y
servicios de Windows en 8081–8084), por eso se usan puertos alternativos.

| Componente | Guía | Usado |
|---|---|---|
| NGINX | 8090 | 8090 |
| API Java instancia A / B | 8080 / 8082 | 8086 / 8087 |
| FastAPI (ventas) | 8002 | 8000 |
| Notificaciones | 8081 | 8088 |
| Monitor de NGINX | 8083 | 8095 |
| React / PWA | 5173 / 5174 | 5173 / 5174 |
| RabbitMQ (AMQP / panel) | 5672 / 15672 | 5672 / 15672 |
| MySQL | 3306 | 3306 |

## 6. Orden de arranque

Cada servicio en su propia terminal, desde la raíz del repositorio.

**1. MySQL** — desde el panel de XAMPP (puerto 3306).

**2. RabbitMQ** — contenedor con los puertos publicados:

```powershell
docker start rabbitmq-taller
# o, la primera vez:
docker run -d --name rabbitmq-taller -p 5672:5672 -p 15672:15672 rabbitmq:management
```

Panel: <http://localhost:15672>.

**3. API Java, instancia A (8086)** y, cuando A ya haya iniciado, **instancia B (8087)**. No arrancarlas a la vez
(Maven falla si compilan el mismo proyecto simultáneamente).

```powershell
cd venta-vehiculos-api_security
mvn spring-boot:run                                   # instancia A
```

```powershell
cd venta-vehiculos-api_security
$env:SERVER_PORT='8087'; mvn spring-boot:run          # instancia B
```

**4. Servicio de notificaciones (8088)**

```powershell
cd notificaciones-service
mvn spring-boot:run
```

**5. FastAPI de ventas (8000)** y, opcionalmente, el **worker** que reintenta las notificaciones pendientes:

```powershell
cd ventas-api-py-1
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

```powershell
cd ventas-api-py-1
.\.venv\Scripts\python.exe -m app.worker
```

**6. NGINX (8090)**

```powershell
cd C:\nginx
.\nginx.exe -c "<ruta-del-repositorio>\nginx\nginx.conf" -p C:/nginx/
```

Comprobar la sintaxis: `.\nginx.exe -t -c "<ruta>\nginx\nginx.conf" -p C:/nginx/`. Recargar: `-s reload`.

**7. Monitor (8095)** — usa el `.jar` ya compilado:

```powershell
cd monitor-balancer-service
java -jar target\monitor-balancer-service-0.0.1-SNAPSHOT.jar
```

**8. Clientes**

```powershell
cd AplicacionMovilPWA;                         npm run dev        # http://localhost:5174
cd AplicacionWebREACT\react-fetch-vehiculos;   npm run dev        # http://localhost:5173
cd escritorioFX\consultarvehiculojavafx;       mvn clean javafx:run
```

Windows Forms: abrir `ConsultaJWT_SOA\ConsultaJWT_SOA.slnx` en Visual Studio y ejecutar (F5).

## 7. Verificación rápida

| Qué | URL | Esperado |
|---|---|---|
| NGINX | <http://127.0.0.1:8090/nginx-ping> | `pong` |
| Java A / B | `http://127.0.0.1:8090/health/a` y `/health/b` | `{"status":"UP"}` |
| FastAPI | <http://127.0.0.1:8000/health> | `{"status":"UP"}` |
| Monitor | <http://localhost:8095> | Estado global OK |
| RabbitMQ | <http://localhost:15672> | Cola `notificaciones.ventas` durable |
| Notificaciones | `GET /api/notificaciones` con cabecera `X-Notification-Key` | Lista de avisos |

## 8. Base de datos

- Base `vehiculos` (MySQL/MariaDB local): tablas `vehiculos`, `usuarios_api`, `reservas`, `compradores`, `ventas`
  y `notificaciones`.
- La tabla `notificaciones` (historial de avisos, `evento_id` único) se crea con
  `notificaciones-service/db/schema.sql` y el servicio también la crea al iniciar si falta.
- FastAPI mantiene sus migraciones en `ventas-api-py-1/alembic`.

## 9. Pruebas automáticas

```powershell
cd ventas-api-py-1;                            .\.venv\Scripts\python.exe -m pytest -q
cd notificaciones-service;                     mvn test
cd escritorioFX\consultarvehiculojavafx;       mvn test
cd AplicacionMovilPWA;                         npm test
cd AplicacionWebREACT\react-fetch-vehiculos;   npm test
```

## 10. Endpoints principales (por NGINX, 8090)

| Método y ruta | Servicio | Quién |
|---|---|---|
| `POST /oauth/token` | Java | Público (cliente OAuth + usuario) |
| `GET /api/vehiculos`, `POST /api/vehiculos` | Java | Consulta: todos; alta: OPERADOR y ADMIN |
| `POST /api/compradores`, `GET /api/compradores` | FastAPI | OPERADOR y ADMIN |
| `POST /api/ventas` (con `Idempotency-Key`) | FastAPI | OPERADOR y ADMIN |
| `GET /api/ventas`, `/api/ventas/{id}`, `/api/ventas/resumen` | FastAPI | Autenticado (ADMIN ve todo; los demás, lo propio) |
| `GET /api/notificaciones` | Notificaciones | Cabecera `X-Notification-Key` |

Roles: `CONSULTA` (solo lectura), `OPERADOR` y `ADMIN`.

## 11. Problemas frecuentes

- **El login responde 401 «Cliente no autorizado»:** el cliente OAuth no coincide entre la API Java y el cliente
  (PWA, React o Windows Forms).
- **FastAPI responde 401 con un token que Java sí emitió:** `JWT_SECRET` no es igual a `app.security.jwt-secret`.
- **La venta queda con notificación PENDIENTE:** RabbitMQ no estaba disponible; arrancar el worker o ejecutar
  `python -m app.worker --once`.
- **JavaFX muestra «Sin configurar»:** falta `NOTIFICACIONES_KEY` o `secrets.local.properties`.
- **Maven falla al arrancar las dos instancias Java:** iniciar primero la A y esperar a que termine.
- **Los puertos 8080–8084 están ocupados:** son los puertos alternativos de la sección 5.
