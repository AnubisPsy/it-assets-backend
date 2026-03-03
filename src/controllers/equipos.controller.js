const { pool, poolConnect, sql } = require("../config/database");

const getEquipos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT * FROM equipos ORDER BY fecha_registro DESC");
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
    const { marca, modelo, serie, procesador, ram, descripcion } = req.body;

    if (!marca || !modelo || !serie) {
      return res
        .status(400)
        .json({ error: "Marca, modelo y serie son requeridos" });
    }

    const result = await pool
      .request()
      .input("marca", sql.VarChar(100), marca)
      .input("modelo", sql.VarChar(150), modelo)
      .input("serie", sql.VarChar(100), serie)
      .input("procesador", sql.VarChar(100), procesador || null)
      .input("ram", sql.VarChar(50), ram || null)
      .input("descripcion", sql.VarChar(300), descripcion || null).query(`
                INSERT INTO equipos (marca, modelo, serie, procesador, ram, descripcion)
                OUTPUT INSERTED.*
                VALUES (@marca, @modelo, @serie, @procesador, @ram, @descripcion)
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
    const { marca, modelo, serie, procesador, ram, descripcion, estado } =
      req.body;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("marca", sql.VarChar(100), marca)
      .input("modelo", sql.VarChar(150), modelo)
      .input("serie", sql.VarChar(100), serie)
      .input("procesador", sql.VarChar(100), procesador || null)
      .input("ram", sql.VarChar(50), ram || null)
      .input("descripcion", sql.VarChar(300), descripcion || null)
      .input("estado", sql.VarChar(20), estado).query(`
                UPDATE equipos
                SET marca = @marca,
                    modelo = @modelo,
                    serie = @serie,
                    procesador = @procesador,
                    ram = @ram,
                    descripcion = @descripcion,
                    estado = @estado
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
