const { pool, poolConnect, sql } = require("../config/database");

const getEquipos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT e.*, t.nombre AS tipo_nombre, s.descripcion AS estado
      FROM equipos e
      LEFT JOIN tipos_equipo t ON e.tipo_id = t.id
      LEFT JOIN estado_equipos s ON e.estado_id = s.id
      ORDER BY e.fecha_registro DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEquipoById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT e.*, t.nombre AS tipo_nombre, s.descripcion AS estado
      FROM equipos e
      LEFT JOIN tipos_equipo t ON e.tipo_id = t.id
      LEFT JOIN estado_equipos s ON e.estado_id = s.id
      WHERE e.id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEquiposConAsignacion = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        e.*,
        t.nombre AS tipo_nombre,
        s.descripcion AS estado,
        p.nombre AS persona_nombre,
        d.nombre AS departamento,
        a.fecha_asignacion
      FROM equipos e
      LEFT JOIN tipos_equipo t ON e.tipo_id = t.id
      LEFT JOIN estado_equipos s ON e.estado_id = s.id
      LEFT JOIN asignaciones a ON a.equipo_id = e.id AND a.activa = 1
      LEFT JOIN personas p ON a.persona_id = p.id
      LEFT JOIN departamentos d ON p.departamento_id = d.id
      ORDER BY t.nombre, e.marca, e.modelo
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEquipo = async (req, res) => {
  try {
    await poolConnect;
    const { tipo_id, marca, modelo, serie, procesador, ram, descripcion, mac } =
      req.body;

    if (!tipo_id) {
      return res.status(400).json({ error: "El tipo de equipo es requerido" });
    }

    // Obtener campos del tipo
    const tipoCheck = await pool
      .request()
      .input("tipo_id", sql.Int, tipo_id)
      .query("SELECT campos FROM tipos_equipo WHERE id = @tipo_id");

    if (tipoCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Tipo de equipo no encontrado" });
    }

    const campos = JSON.parse(tipoCheck.recordset[0].campos);

    // Validar solo los campos del tipo
    const faltantes = campos.filter((campo) => {
      const valor = req.body[campo];
      return !valor || valor.toString().trim() === "";
    });

    if (faltantes.length > 0) {
      return res.status(400).json({
        error: `Los siguientes campos son requeridos: ${faltantes.join(", ")}`,
      });
    }

    const result = await pool
      .request()
      .input("tipo_id", sql.Int, tipo_id)
      .input("marca", sql.VarChar(100), marca || null)
      .input("modelo", sql.VarChar(150), modelo || null)
      .input("serie", sql.VarChar(100), serie || null)
      .input("procesador", sql.VarChar(100), procesador || null)
      .input("ram", sql.VarChar(50), ram || null)
      .input("descripcion", sql.VarChar(300), descripcion || null)
      .input("mac", sql.VarChar(50), mac || null).query(`
        INSERT INTO equipos (tipo_id, marca, modelo, serie, procesador, ram, descripcion, mac, estado_id)
        OUTPUT INSERTED.*
        VALUES (@tipo_id, @marca, @modelo, @serie, @procesador, @ram, @descripcion, @mac, 1)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEquipo = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const {
      tipo_id,
      marca,
      modelo,
      serie,
      procesador,
      ram,
      descripcion,
      estado_id,
      mac,
    } = req.body;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("tipo_id", sql.Int, tipo_id || null)
      .input("marca", sql.VarChar(100), marca)
      .input("modelo", sql.VarChar(150), modelo)
      .input("serie", sql.VarChar(100), serie)
      .input("procesador", sql.VarChar(100), procesador || null)
      .input("ram", sql.VarChar(50), ram || null)
      .input("descripcion", sql.VarChar(300), descripcion || null)
      .input("estado_id", sql.Int, estado_id)
      .input("mac", sql.VarChar(50), mac || null).query(`
        UPDATE equipos
        SET tipo_id = @tipo_id,
            marca = @marca,
            modelo = @modelo,
            serie = @serie,
            procesador = @procesador,
            ram = @ram,
            descripcion = @descripcion,
            estado_id = @estado_id,
            mac = @mac
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEstados = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query("SELECT * FROM estado_equipos");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getEquipos,
  getEquipoById,
  getEquiposConAsignacion,
  createEquipo,
  updateEquipo,
  getEstados,
};
