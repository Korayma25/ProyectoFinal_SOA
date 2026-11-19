from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

class CrearComprador(BaseModel):

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    documento: str = Field(min_length=3, max_length=30)

    nombre: str = Field(min_length=2, max_length=120)

    correo: str = Field(min_length=5, max_length=200,

                        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class CompradorSalida(BaseModel):

    """Datos del comprador que pueden exponerse por la API."""

    model_config = ConfigDict(from_attributes=True)

    id: int

    documento: str

    nombre: str

    correo: str

class ActualizarComprador(BaseModel):

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nombre: str = Field(min_length=2, max_length=120)

    correo: str = Field(min_length=5, max_length=200,

                        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class CrearVenta(BaseModel):

    model_config = ConfigDict(extra="forbid")

    vehiculoId: int = Field(gt=0, strict=True)

    compradorId: int = Field(gt=0, strict=True)

class VentaSalida(BaseModel):

    id: int
    operacionId: str
    vehiculoId: int
    compradorId: int
    precioAcordado: str | None
    moneda: str | None
    estado: str
    notificacion: str
    fechaUTC: str | None

class PaginaVentasSalida(BaseModel):

    items: list[VentaSalida]
    total: int = Field(ge=0)
    limit: int = Field(ge=1, le=50)
    offset: int = Field(ge=0)

class ResumenVentasSalida(BaseModel):

    completadas: int = Field(ge=0)
    ingresos: Decimal = Field(ge=0)
    pendientes: int = Field(ge=0)
    enRevision: int = Field(ge=0)
    fallidas: int = Field(ge=0)

class ComprobanteVentaSalida(BaseModel):

    id: int
    comprador: CompradorSalida
    vehiculoId: int
    precioConfirmado: Decimal
    moneda: str
    fechaUTC: str | None
