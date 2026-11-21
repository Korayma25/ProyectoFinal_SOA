import jwt

from fastapi import Header

from app.config import JWT_SECRET
from app.errors import ApiError

ROLES_VALIDOS = {"CONSULTA", "OPERADOR", "ADMIN"}
ALGORITMOS = ["HS256", "HS384", "HS512"]   # nunca "none": la firma es obligatoria


def identidad(authorization: str | None = Header(default=None)):
    """Valida el JWT de usuario recibido, sin depender de otro servicio:
    - autenticidad: firma HMAC con la clave compartida (JWT_SECRET);
    - expiración: el claim exp es obligatorio y no puede estar vencido;
    - tipo: solo access tokens (no refresh tokens);
    - rol: debe ser CONSULTA, OPERADOR o ADMIN.
    Devuelve {"usuario", "roles"}; los permisos por operación los aplican vendedor() y propietario()."""
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "NO_AUTENTICADO", "Enviar access token")
    token = authorization[7:].strip()
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=ALGORITMOS,
                            options={"require": ["exp", "sub"]})
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRADO", "El token venció")
    except jwt.PyJWTError:
        raise ApiError(401, "TOKEN_INVALIDO", "Token no autorizado")
    if claims.get("tipo") != "access":
        raise ApiError(401, "TOKEN_INVALIDO", "Se requiere access token")
    rol = claims.get("rol")
    if rol not in ROLES_VALIDOS:
        raise ApiError(403, "ROL_INVALIDO", "Rol no reconocido")
    usuario = claims["sub"]
    if not isinstance(usuario, str) or not usuario or len(usuario) > 100:
        raise ApiError(401, "TOKEN_INVALIDO", "Usuario inválido")
    return {"usuario": usuario, "roles": ["ROLE_" + rol]}


def vendedor(usuario):

    if not {"ROLE_OPERADOR", "ROLE_ADMIN"}.intersection(usuario["roles"]):

        raise ApiError(403, "SIN_PERMISO", "Se requiere OPERADOR o ADMIN")

def ambito(usuario):
    """Alcance de los listados: ADMIN ve los datos de todos (None = sin filtro por usuario);
    OPERADOR solo ve lo suyo (su nombre de usuario)."""
    return None if "ROLE_ADMIN" in usuario["roles"] else usuario["usuario"]


def propietario(usuario, dueno):

    if usuario["usuario"] != dueno and "ROLE_ADMIN" not in usuario["roles"]:

        raise ApiError(403, "SIN_PERMISO", "Recurso de otro usuario")