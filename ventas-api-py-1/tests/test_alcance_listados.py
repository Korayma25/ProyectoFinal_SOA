from types import SimpleNamespace

from app import security
from app.repositories.venta_repository import VentaRepository


def usuario(rol, nombre="maria"):
    return {"usuario": nombre, "roles": ["ROLE_" + rol]}


def test_ambito_admin_ve_todo_y_operador_solo_lo_suyo():
    assert security.ambito(usuario("ADMIN")) is None
    assert security.ambito(usuario("OPERADOR")) == "maria"
    assert security.ambito(usuario("CONSULTA")) == "maria"


class BdFalsa:
    """Registra el SQL generado para comprobar si filtra por usuario."""
    def __init__(self):
        self.sql = []

    def _guardar(self, consulta):
        self.sql.append(str(consulta.compile(compile_kwargs={"literal_binds": True})))

    def scalar(self, consulta):
        self._guardar(consulta)
        return 0

    def scalars(self, consulta):
        self._guardar(consulta)
        return SimpleNamespace(all=lambda: [])

    def execute(self, consulta):
        self._guardar(consulta)
        return SimpleNamespace(one=lambda: (0, 0, 0, 0, 0))


def test_listado_de_ventas_filtra_por_usuario_salvo_admin():
    db = BdFalsa()
    VentaRepository(db).pagina_por_usuario("maria", None, 10, 0)
    assert all("ventas.usuario = 'maria'" in s for s in db.sql)
    db = BdFalsa()
    VentaRepository(db).pagina_por_usuario(None, None, 10, 0)
    assert all("ventas.usuario" not in s.split("ORDER")[0].split("WHERE")[-1] for s in db.sql if "WHERE" in s)
    assert not any("usuario = " in s for s in db.sql)


def test_resumen_filtra_por_usuario_salvo_admin():
    db = BdFalsa()
    VentaRepository(db).resumen_por_usuario("maria")
    assert "ventas.usuario = 'maria'" in db.sql[0]
    db = BdFalsa()
    VentaRepository(db).resumen_por_usuario(None)
    assert "usuario = " not in db.sql[0]
