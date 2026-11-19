from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy import or_, select

from app.db import SessionLocal
from app.models import Venta, Comprador
from app.schemas import (
    ActualizarComprador, ComprobanteVentaSalida, CompradorSalida,
    CrearComprador, CrearVenta, PaginaVentasSalida, ResumenVentasSalida,
)
from app.security import identidad, vendedor, propietario
from app.errors import ApiError
from app.services import venta_service as service
from app.repositories.venta_repository import VentaRepository

router = APIRouter(prefix="/api")

ESTADOS_VENTA = Literal["PENDIENTE", "EN_REVISION", "COMPLETADA", "FALLIDA"]

def salida_comprador(comprador: Comprador):

    return CompradorSalida.model_validate(comprador).model_dump()

@router.post("/compradores", status_code=201)

def crear_comprador(d: CrearComprador, u=Depends(identidad)):

    vendedor(u)

    with SessionLocal.begin() as db:

        c = Comprador(usuario=u["usuario"], **d.model_dump())

        db.add(c); db.flush()

        return {"id": c.id, "nombre": c.nombre, "correo": c.correo}

@router.get("/compradores")

def listar_compradores(
    buscar: Annotated[str | None, Query(min_length=1, max_length=120,
                                        pattern=r".*\S.*")] = None,
    u=Depends(identidad),
):

    vendedor(u)

    with SessionLocal() as db:

        consulta = select(Comprador).where(Comprador.usuario == u["usuario"])

        if buscar is not None:

            termino = buscar.strip()

            consulta = consulta.where(or_(
                Comprador.nombre.contains(termino, autoescape=True),
                Comprador.documento.contains(termino, autoescape=True),
            ))

        compradores = db.scalars(

            consulta.order_by(Comprador.id)).all()

        return [salida_comprador(comprador) for comprador in compradores]

@router.get("/compradores/{id}")

def obtener_comprador(id: int, u=Depends(identidad)):

    with SessionLocal() as db:

        comprador = db.get(Comprador, id)

        if comprador is None:

            raise ApiError(404, "COMPRADOR_NO_EXISTE", "Comprador inexistente")

        propietario(u, comprador.usuario)

        return salida_comprador(comprador)

@router.put("/compradores/{id}")

def actualizar_comprador(id: int, d: ActualizarComprador, u=Depends(identidad)):

    vendedor(u)

    with SessionLocal.begin() as db:

        comprador = db.get(Comprador, id)

        if comprador is None:

            raise ApiError(404, "COMPRADOR_NO_EXISTE", "Comprador inexistente")

        propietario(u, comprador.usuario)

        comprador.nombre = d.nombre
        comprador.correo = d.correo

        db.flush()

        return salida_comprador(comprador)

@router.post("/ventas")

def crear(d: CrearVenta, response: Response,

          idempotency_key: Annotated[str, Header(

              min_length=8, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")],

          u=Depends(identidad)):

    vendedor(u)

    resultado, codigo = service.crear(d, idempotency_key, u)

    response.status_code = codigo

    response.headers["Location"] = f"/api/ventas/{resultado['id']}"

    return resultado

@router.get("/ventas/resumen", response_model=ResumenVentasSalida)

def resumen_ventas(u=Depends(identidad)):

    vendedor(u)

    with SessionLocal() as db:

        completadas, ingresos, pendientes, en_revision, fallidas = (
            VentaRepository(db).resumen_por_usuario(u["usuario"]))

        return {
            "completadas": completadas,
            "ingresos": ingresos,
            "pendientes": pendientes,
            "enRevision": en_revision,
            "fallidas": fallidas,
        }

@router.get("/ventas/{id}/comprobante", response_model=ComprobanteVentaSalida)

def comprobante_venta(id: int, u=Depends(identidad)):

    with SessionLocal() as db:

        venta = db.get(Venta, id)

        if venta is None:

            raise ApiError(404, "VENTA_NO_EXISTE", "Venta inexistente")

        propietario(u, venta.usuario)

        if (venta.estado != "COMPLETADA" or venta.precio_acordado is None
                or venta.moneda is None):

            raise ApiError(409, "VENTA_NO_CONFIRMADA",
                           "El comprobante requiere una venta completada")

        return {
            "id": venta.id,
            "comprador": salida_comprador(venta.comprador),
            "vehiculoId": venta.vehiculo_id,
            "precioConfirmado": venta.precio_acordado,
            "moneda": venta.moneda,
            "fechaUTC": service.fecha_utc(venta),
        }

@router.get("/ventas/{id}")

def obtener(id: int, u=Depends(identidad)):

    with SessionLocal() as db:

        v = db.get(Venta, id)

        if v is None:

            raise ApiError(404, "VENTA_NO_EXISTE", "Venta inexistente")

        propietario(u, v.usuario)

        return service.salida(v)

@router.get("/ventas", response_model=PaginaVentasSalida)

def listar_ventas(
    estado: ESTADOS_VENTA | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
    u=Depends(identidad),
):

    with SessionLocal() as db:

        ventas, total = VentaRepository(db).pagina_por_usuario(
            u["usuario"], estado, limit, offset)

        return {
            "items": [service.salida(venta) for venta in ventas],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
