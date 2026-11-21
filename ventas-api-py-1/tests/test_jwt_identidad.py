import base64
import json
import time

import jwt
import pytest

from app import security
from app.errors import ApiError

CLAVE = "clave-de-prueba-solo-para-tests-0123456789"


@pytest.fixture(autouse=True)
def clave(monkeypatch):
    monkeypatch.setattr(security, "JWT_SECRET", CLAVE)


def token(rol="OPERADOR", tipo="access", exp=300, clave=CLAVE, algoritmo="HS256", sub="maria"):
    carga = {"sub": sub, "rol": rol, "tipo": tipo, "iat": int(time.time())}
    if exp is not None:
        carga["exp"] = int(time.time()) + exp
    return jwt.encode(carga, clave, algorithm=algoritmo)


def codigo(cabecera):
    with pytest.raises(ApiError) as e:
        security.identidad(cabecera)
    return e.value.status


def test_token_valido_devuelve_usuario_y_rol():
    u = security.identidad(f"Bearer {token('ADMIN')}")
    assert u == {"usuario": "maria", "roles": ["ROLE_ADMIN"]}


@pytest.mark.parametrize("algoritmo", ["HS256", "HS384", "HS512"])
def test_acepta_los_algoritmos_hmac_que_emite_java(algoritmo):
    assert security.identidad(f"Bearer {token(algoritmo=algoritmo)}")["usuario"] == "maria"


@pytest.mark.parametrize("cabecera", [None, "", "Basic abc", "Bearer ", "Bearer no-es-un-jwt"])
def test_ausente_o_mal_formado_es_401(cabecera):
    assert codigo(cabecera) == 401


def test_token_vencido_es_401_expirado():
    with pytest.raises(ApiError) as e:
        security.identidad(f"Bearer {token(exp=-10)}")
    assert (e.value.status, e.value.codigo) == (401, "TOKEN_EXPIRADO")


def test_firma_de_otra_clave_es_401():
    assert codigo(f"Bearer {token(clave='otra-clave-distinta-de-mas-de-32-caracteres')}") == 401


def test_payload_alterado_sin_refirmar_es_401():
    cab, carga, firma = token("CONSULTA").split(".")
    datos = json.loads(base64.urlsafe_b64decode(carga + "=" * (-len(carga) % 4)))
    datos["rol"] = "ADMIN"
    nueva = base64.urlsafe_b64encode(json.dumps(datos).encode()).rstrip(b"=").decode()
    assert codigo(f"Bearer {cab}.{nueva}.{firma}") == 401


def test_algoritmo_none_es_rechazado():
    cab = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=").decode()
    carga = base64.urlsafe_b64encode(json.dumps({"sub": "x", "rol": "ADMIN", "tipo": "access", "exp": int(time.time()) + 300}).encode()).rstrip(b"=").decode()
    assert codigo(f"Bearer {cab}.{carga}.") == 401


def test_sin_exp_es_401():
    assert codigo(f"Bearer {token(exp=None)}") == 401


def test_refresh_token_no_sirve_como_access():
    assert codigo(f"Bearer {token(tipo='refresh')}") == 401


def test_rol_desconocido_es_403():
    assert codigo(f"Bearer {token('SUPERUSUARIO')}") == 403


def test_permisos_por_rol():
    consulta = security.identidad(f"Bearer {token('CONSULTA')}")
    with pytest.raises(ApiError):
        security.vendedor(consulta)               # CONSULTA no registra ventas (403)
    for rol in ("OPERADOR", "ADMIN"):
        security.vendedor(security.identidad(f"Bearer {token(rol)}"))
    ajeno = security.identidad(f"Bearer {token('OPERADOR', sub='pedro')}")
    with pytest.raises(ApiError):
        security.propietario(ajeno, "maria")      # recurso de otro usuario
    security.propietario(security.identidad(f"Bearer {token('ADMIN')}"), "maria")
