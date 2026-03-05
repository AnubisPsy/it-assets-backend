const { pool, poolConnect, sql } = require("../config/database");

const getTipos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT * FROM tipos_equipo ORDER BY nombre");

    const tipos = result.recordset.map((tipo) => ({
      ...tipo,
      campos: JSON.parse(tipo.campos),
    }));

    res.json(tipos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTipoById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM tipos_equipo WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Tipo de equipo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTipo = async (req, res) => {
  try {
    await poolConnect;
    const { nombre, campos } = req.body;

    if (!nombre || !campos || !Array.isArray(campos) || campos.length === 0) {
      return res
        .status(400)
        .json({ error: "Nombre y al menos un campo son requeridos" });
    }

    const result = await pool
      .request()
      .input("nombre", sql.VarChar(100), nombre.trim())
      .input("campos", sql.VarChar(sql.MAX), JSON.stringify(campos)).query(`
                INSERT INTO tipos_equipo (nombre, campos)
                OUTPUT INSERTED.*
                VALUES (@nombre, @campos)
            `);

    const tipo = result.recordset[0];
    tipo.campos = JSON.parse(tipo.campos);
    res.status(201).json(tipo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateTipo = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { nombre, campos } = req.body;

    if (!nombre || !campos || !Array.isArray(campos) || campos.length === 0) {
      return res
        .status(400)
        .json({ error: "Nombre y al menos un campo son requeridos" });
    }

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(100), nombre.trim())
      .input("campos", sql.VarChar(sql.MAX), JSON.stringify(campos)).query(`
                UPDATE tipos_equipo
                SET nombre = @nombre, campos = @campos
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Tipo de equipo no encontrado" });
    }

    const tipo = result.recordset[0];
    tipo.campos = JSON.parse(tipo.campos);
    res.json(tipo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteTipo = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;

    const enUso = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT COUNT(*) as total FROM equipos WHERE tipo_id = @id");

    if (enUso.recordset[0].total > 0) {
      return res.status(400).json({
        error: "No se puede eliminar un tipo que tiene equipos registrados",
      });
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM tipos_equipo WHERE id = @id");

    res.json({ mensaje: "Tipo eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getTipos, getTipoById, createTipo, updateTipo, deleteTipo };
