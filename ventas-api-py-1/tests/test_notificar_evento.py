from contextlib import contextmanager
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.services import venta_service as vs


@pytest.fixture
def publicados(monkeypatch):
    eventos = []
    monkeypatch.setattr(vs, "publicar_evento", lambda e: (eventos.append(e), True)[1])
    return eventos


def _preparar(monkeypatch, venta):
    @contextmanager
    def sesion():
        yield object()
    monkeypatch.setattr(vs.SessionLocal, "begin", staticmethod(sesion))
    monkeypatch.setattr(vs, "VentaRepository", lambda db: SimpleNamespace(bloquear=lambda id: venta))


def _venta(estado="COMPLETADA", notificacion="PENDIENTE"):
    return SimpleNamespace(id=21, operacion_id="op-21", vehiculo_id=24, estado=estado,
                           notificacion=notificacion, fecha=datetime(2026, 11, 19, 23, 41, 1))


def test_venta_completada_publica_un_evento_y_queda_enviada(monkeypatch, publicados):
    v = _venta()
    _preparar(monkeypatch, v)
    vs.notificar(21)
    assert len(publicados) == 1 and v.notificacion == "ENVIADA"
    assert publicados[0]["ventaId"] == 21 and publicados[0]["vehiculoId"] == 24


@pytest.mark.parametrize("estado", ["FALLIDA", "PENDIENTE", "EN_REVISION"])
def test_venta_rechazada_o_no_confirmada_no_publica(monkeypatch, publicados, estado):
    _preparar(monkeypatch, _venta(estado=estado))
    vs.notificar(21)
    assert publicados == []


def test_reintento_idempotente_no_repite_el_evento(monkeypatch, publicados):
    _preparar(monkeypatch, _venta(notificacion="ENVIADA"))
    vs.notificar(21)
    assert publicados == []


def test_si_rabbitmq_falla_queda_pendiente_para_el_worker(monkeypatch):
    v = _venta()
    _preparar(monkeypatch, v)
    monkeypatch.setattr(vs, "publicar_evento", lambda e: False)
    vs.notificar(21)
    assert v.notificacion == "PENDIENTE"
