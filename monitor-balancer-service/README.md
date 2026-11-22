# monitor-balancer-service

Monitor independiente (fuera del flujo de ventas) que supervisa NGINX y las dos instancias de la API Java de vehículos.

## Requisitos
- Java 17+ y Maven.

## Ejecutar
```bash
mvn spring-boot:run
```
Panel: http://localhost:8095/ (puerto cambiable con `MONITOR_PORT`; el 8083 de la guía está reservado en este equipo).

## Endpoints
| Ruta | Descripción |
|---|---|
| `GET /api/monitor/estado` | UP/DOWN, HTTP, latencia y fallos consecutivos de NGINX, instancia A e instancia B; estado global (OK, DEGRADADO, CAIDO). |
| `GET /api/monitor/estadisticas` | Reparto de `GET /api/vehiculos` por backend, porcentajes, reintentos y tiempo medio, leídos del `access.log`. |
| `GET /api/monitor/alertas` | Historial de caídas y recuperaciones (más recientes primero). |

## Configuración (variables de entorno, con valores por defecto)
| Variable | Defecto |
|---|---|
| `MONITOR_PORT` | 8095 |
| `MONITOR_NGINX_URL` | http://127.0.0.1:8090/nginx-ping |
| `MONITOR_INSTANCIA_A` | http://127.0.0.1:8086/actuator/health |
| `MONITOR_INSTANCIA_B` | http://127.0.0.1:8087/actuator/health |
| `MONITOR_ACCESS_LOG` | C:/nginx/logs/access.log |
| `MONITOR_INTERVALO_MS` | 5000 |
| `MONITOR_TIMEOUT_MS` | 2000 |

El monitor es de solo lectura, no usa JWT ni guarda secretos.
