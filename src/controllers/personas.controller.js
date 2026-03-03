const { pool, poolConnect, sql } = require("../config/database");

const getPersonas = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT * FROM personas ORDER BY nombre");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPersonaById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM personas WHERE id = @id");

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
    const { nombre, numero_identidad, departamento } = req.body;

    if (!nombre || !numero_identidad || !departamento) {
      return res
        .status(400)
        .json({ error: "Nombre, identidad y departamento son requeridos" });
    }

    const result = await pool
      .request()
      .input("nombre", sql.VarChar(150), nombre)
      .input("numero_identidad", sql.VarChar(20), numero_identidad)
      .input("departamento", sql.VarChar(100), departamento).query(`
                INSERT INTO personas (nombre, numero_identidad, departamento)
                OUTPUT INSERTED.*
                VALUES (@nombre, @numero_identidad, @departamento)
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
    const { nombre, numero_identidad, departamento, activo } = req.body;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(150), nombre)
      .input("numero_identidad", sql.VarChar(20), numero_identidad)
      .input("departamento", sql.VarChar(100), departamento)
      .input("activo", sql.Bit, activo).query(`
                UPDATE personas
                SET nombre = @nombre,
                    numero_identidad = @numero_identidad,
                    departamento = @departamento,
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

module.exports = { getPersonas, getPersonaById, createPersona, updatePersona };
