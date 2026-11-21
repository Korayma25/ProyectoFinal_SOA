import os

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

def requerido(nombre):

    valor = os.environ.get(nombre, "")

    if not valor:

        raise RuntimeError(f"Falta configurar {nombre}")

    return valor

JAVA_URL = requerido("JAVA_URL").rstrip("/")

SERVICE_KEY = requerido("VENTAS_SERVICE_KEY")

NOTIF_URL = requerido("NOTIFICACIONES_URL").rstrip("/")

NOTIF_KEY = requerido("NOTIFICACIONES_KEY")

if min(len(SERVICE_KEY), len(NOTIF_KEY)) < 32:

    raise RuntimeError("Claves de servicio de al menos 32 caracteres")

if SERVICE_KEY.startswith("COLOCA_") or NOTIF_KEY.startswith("COLOCA_"):

    raise RuntimeError("Reemplaza las claves de ejemplo en el archivo .env")

# RabbitMQ (Actividad 8). Las credenciales se leen del entorno o del .env, nunca del código.
RABBIT_HOST = os.environ.get("RABBITMQ_HOST", "127.0.0.1")
RABBIT_PORT = int(os.environ.get("RABBITMQ_PORT", "5672"))
RABBIT_USER = requerido("RABBITMQ_USER")
RABBIT_PASSWORD = requerido("RABBITMQ_PASSWORD")
COLA_VENTAS = os.environ.get("RABBITMQ_COLA_VENTAS", "notificaciones.ventas")

# Clave de firma del JWT: debe ser la MISMA de la API Java (app.security.jwt-secret). Solo del entorno o .env.
JWT_SECRET = requerido("JWT_SECRET")
if len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET debe tener al menos 32 caracteres")
