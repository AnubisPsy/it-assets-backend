const { pool, poolConnect, sql } = require("../config/database");

const getEquipos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT e.*, t.nombre AS tipo_nombre
      FROM equipos e
      LEFT JOIN tipos_equipo t ON e.tipo_id = t.id
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
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM equipos WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEquipo = async (req, res) => {
  try {
    await poolConnect;
    const { tipo_id, marca, modelo, serie, procesador, ram, descripcion, mac } =
      req.body;

    if (!tipo_id || !marca || !modelo || !serie) {
      return res
        .status(400)
        .json({ error: "Tipo, marca, modelo y serie son requeridos" });
    }

    const result = await pool
      .request()
      .input("tipo_id", sql.Int, tipo_id)
      .input("marca", sql.VarChar(100), marca)
      .input("modelo", sql.VarChar(150), modelo)
      .input("serie", sql.VarChar(100), serie)
      .input("procesador", sql.VarChar(100), procesador || null)
      .input("ram", sql.VarChar(50), ram || null)
      .input("descripcion", sql.VarChar(300), descripcion || null)
      .input("mac", sql.VarChar(50), mac || null).query(`
        INSERT INTO equipos (tipo_id, marca, modelo, serie, procesador, ram, descripcion, mac)
        OUTPUT INSERTED.*
        VALUES (@tipo_id, @marca, @modelo, @serie, @procesador, @ram, @descripcion, @mac)
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
      estado,
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
      .input("estado", sql.VarChar(20), estado)
      .input("mac", sql.VarChar(50), mac || null).query(`
        UPDATE equipos
        SET tipo_id = @tipo_id,
            marca = @marca,
            modelo = @modelo,
            serie = @serie,
            procesador = @procesador,
            ram = @ram,
            descripcion = @descripcion,
            estado = @estado,
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

module.exports = { getEquipos, getEquipoById, createEquipo, updateEquipo };
