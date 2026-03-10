const { pool, poolConnect, sql } = require("../config/database");

const getPersonas = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT p.*, d.nombre AS departamento
      FROM personas p
      JOIN departamentos d ON p.departamento_id = d.id
      ORDER BY p.nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPersonaById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT p.*, d.nombre AS departamento
      FROM personas p
      JOIN departamentos d ON p.departamento_id = d.id
      WHERE p.id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPersona = async (req, res) => {
  try {
    await poolConnect;
    const { nombre, numero_identidad, departamento_id } = req.body;

    if (!nombre || !numero_identidad || !departamento_id) {
      return res
        .status(400)
        .json({ error: "Nombre, identidad y departamento son requeridos" });
    }

    const result = await pool
      .request()
      .input("nombre", sql.VarChar(150), nombre)
      .input("numero_identidad", sql.VarChar(20), numero_identidad)
      .input("departamento_id", sql.Int, departamento_id).query(`
        INSERT INTO personas (nombre, numero_identidad, departamento_id)
        OUTPUT INSERTED.*
        VALUES (@nombre, @numero_identidad, @departamento_id)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePersona = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { nombre, numero_identidad, departamento_id, activo } = req.body;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(150), nombre)
      .input("numero_identidad", sql.VarChar(20), numero_identidad)
      .input("departamento_id", sql.Int, departamento_id)
      .input("activo", sql.Bit, activo).query(`
        UPDATE personas
        SET nombre = @nombre,
            numero_identidad = @numero_identidad,
            departamento_id = @departamento_id,
            activo = @activo
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDepartamentos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT * FROM departamentos ORDER BY nombre");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPersonas,
  getPersonaById,
  createPersona,
  updatePersona,
  getDepartamentos,
};
