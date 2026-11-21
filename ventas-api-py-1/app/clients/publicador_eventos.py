"""Publicador de eventos de venta en RabbitMQ (Actividad 8).

Es independiente de los endpoints: solo conoce RabbitMQ y recibe el evento ya construido.
- Cola durable (notificaciones.ventas) y mensajes persistentes (delivery_mode = 2).
- Confirmaciones del publicador: devuelve True solo si el broker aceptó el mensaje.
- El mensaje no lleva JWT, contraseñas ni datos personales.
"""
import json
import logging
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

import pika
from pika.exceptions import AMQPError

from app.config import COLA_VENTAS, RABBIT_HOST, RABBIT_PASSWORD, RABBIT_PORT, RABBIT_USER

TIPO_VENTA = "VENTA_COMPLETADA"


def construir_evento_venta(operacion_id, venta_id, vehiculo_id, fecha_iso=None):
    """Evento de negocio. eventoId es determinista (uuid5 de la operación): si la publicación se
    reintenta, el consumidor recibe el MISMO eventoId y puede descartar el duplicado."""
    return {
        "eventoId": str(uuid5(NAMESPACE_URL, f"venta:{operacion_id}")),
        "tipo": TIPO_VENTA,
        "ventaId": venta_id,
        "vehiculoId": vehiculo_id,
        "fechaHora": fecha_iso or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def _parametros():
    return pika.ConnectionParameters(
        host=RABBIT_HOST, port=RABBIT_PORT,
        credentials=pika.PlainCredentials(RABBIT_USER, RABBIT_PASSWORD),
        connection_attempts=1, socket_timeout=3, blocked_connection_timeout=3)


def publicar_evento(evento, conexion_factory=None):
    """Publica el evento en la cola durable. True = confirmado por RabbitMQ; False = no publicado."""
    try:
        with (conexion_factory or (lambda: pika.BlockingConnection(_parametros())))() as conexion:
            canal = conexion.channel()
            canal.queue_declare(queue=COLA_VENTAS, durable=True)
            canal.confirm_delivery()
            canal.basic_publish(
                exchange="", routing_key=COLA_VENTAS,
                body=json.dumps(evento, separators=(",", ":")).encode("utf-8"),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=pika.DeliveryMode.Persistent,
                    message_id=evento["eventoId"], type=evento["tipo"]),
                mandatory=True)
        logging.info("Evento %s publicado (venta %s)", evento["eventoId"], evento["ventaId"])
        return True
    except (AMQPError, OSError):
        logging.warning("No se pudo publicar el evento %s en RabbitMQ", evento.get("eventoId"), exc_info=True)
        return False
