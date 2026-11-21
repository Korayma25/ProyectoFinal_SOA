import json
from unittest.mock import MagicMock

import pika
import pytest

from app.clients import publicador_eventos as pub


def test_evento_trae_campos_exigidos_y_nada_sensible():
    e = pub.construir_evento_venta("op-1", 21, 24, "2026-11-19T23:41:01Z")
    assert set(e) == {"eventoId", "tipo", "ventaId", "vehiculoId", "fechaHora"}
    assert e["tipo"] == "VENTA_COMPLETADA" and e["ventaId"] == 21 and e["vehiculoId"] == 24
    texto = json.dumps(e).lower()
    assert "jwt" not in texto and "bearer" not in texto and "correo" not in texto


def test_evento_id_es_estable_para_reintentos_y_distinto_entre_ventas():
    a = pub.construir_evento_venta("op-1", 1, 1)["eventoId"]
    assert a == pub.construir_evento_venta("op-1", 1, 1)["eventoId"]
    assert a != pub.construir_evento_venta("op-2", 2, 2)["eventoId"]


def _fabrica(canal):
    conexion = MagicMock()
    conexion.__enter__.return_value = conexion
    conexion.channel.return_value = canal
    return lambda: conexion


def test_publica_en_cola_durable_con_mensaje_persistente_y_confirmacion():
    canal = MagicMock()
    evento = pub.construir_evento_venta("op-1", 21, 24, "2026-11-19T23:41:01Z")
    assert pub.publicar_evento(evento, _fabrica(canal)) is True
    canal.queue_declare.assert_called_once_with(queue="notificaciones.ventas", durable=True)
    canal.confirm_delivery.assert_called_once()
    kw = canal.basic_publish.call_args.kwargs
    assert kw["routing_key"] == "notificaciones.ventas" and kw["mandatory"] is True
    assert kw["properties"].delivery_mode == pika.DeliveryMode.Persistent
    assert json.loads(kw["body"])["eventoId"] == evento["eventoId"]


def test_si_rabbitmq_no_confirma_o_esta_caido_devuelve_false():
    evento = pub.construir_evento_venta("op-1", 1, 1)
    canal = MagicMock()
    canal.basic_publish.side_effect = pika.exceptions.NackError([])
    assert pub.publicar_evento(evento, _fabrica(canal)) is False

    def caida():
        raise pika.exceptions.AMQPConnectionError()
    assert pub.publicar_evento(evento, caida) is False
