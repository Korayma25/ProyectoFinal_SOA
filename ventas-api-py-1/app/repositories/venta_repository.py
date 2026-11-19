from sqlalchemy import case, func, or_, select

from app.models import Venta

class VentaRepository:

    def __init__(self, db):

        self.db = db

    def por_clave(self, usuario, clave):

        return self.db.scalar(select(Venta).where(

            Venta.usuario == usuario, Venta.idempotency_key == clave))

    def bloquear(self, id):

        return self.db.scalar(select(Venta).where(Venta.id == id)

                              .with_for_update())

    def listar_por_usuario(self, usuario, estado=None):

        consulta = select(Venta).where(Venta.usuario == usuario)

        if estado is not None:

            consulta = consulta.where(Venta.estado == estado)

        return self.db.scalars(consulta.order_by(

            Venta.fecha.desc(), Venta.id.desc())).all()

    def pagina_por_usuario(self, usuario, estado, limit, offset):

        condiciones = [Venta.usuario == usuario]

        if estado is not None:

            condiciones.append(Venta.estado == estado)

        total = self.db.scalar(select(func.count()).select_from(Venta)

                               .where(*condiciones))

        ventas = self.db.scalars(select(Venta).where(*condiciones).order_by(

            Venta.fecha.desc(), Venta.id.desc()).limit(limit).offset(offset)).all()

        return ventas, total

    def resumen_por_usuario(self, usuario):

        return self.db.execute(select(
            func.coalesce(func.sum(case(
                (Venta.estado == "COMPLETADA", 1), else_=0)), 0),
            func.coalesce(func.sum(case(
                (Venta.estado == "COMPLETADA", Venta.precio_acordado),
                else_=0)), 0),
            func.coalesce(func.sum(case(
                (Venta.estado == "PENDIENTE", 1), else_=0)), 0),
            func.coalesce(func.sum(case(
                (Venta.estado == "EN_REVISION", 1), else_=0)), 0),
            func.coalesce(func.sum(case(
                (Venta.estado == "FALLIDA", 1), else_=0)), 0),
        ).where(Venta.usuario == usuario)).one()

    def pendientes(self):

        return self.db.scalars(select(Venta.id).where(or_(

            Venta.estado.in_(["PENDIENTE", "EN_REVISION"]),

            (Venta.estado == "COMPLETADA") &

            (Venta.notificacion != "ENVIADA")))

            .order_by(Venta.id).limit(100)).all()
