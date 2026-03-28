const { pool, poolConnect, sql } = require("../config/database");

const getInsumos = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT * FROM insumos ORDER BY categoria, nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getInsumoById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM insumos WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createInsumo = async (req, res) => {
  try {
    await poolConnect;
    const { nombre, categoria, stock, stock_minimo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    const result = await pool
      .request()
      .input("nombre", sql.VarChar(150), nombre)
      .input("categoria", sql.VarChar(100), categoria || null)
      .input("stock", sql.Int, stock || 0)
      .input("stock_minimo", sql.Int, stock_minimo || 0).query(`
        INSERT INTO insumos (nombre, categoria, stock, stock_minimo)
        OUTPUT INSERTED.*
        VALUES (@nombre, @categoria, @stock, @stock_minimo)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateInsumo = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { nombre, categoria, stock_minimo } = req.body;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(150), nombre)
      .input("categoria", sql.VarChar(100), categoria || null)
      .input("stock_minimo", sql.Int, stock_minimo || 0).query(`
        UPDATE insumos
        SET nombre       = @nombre,
            categoria    = @categoria,
            stock_minimo = @stock_minimo
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCategorias = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT DISTINCT categoria FROM insumos WHERE categoria IS NOT NULL ORDER BY categoria
    `);
    res.json(result.recordset.map((r) => r.categoria));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  getCategorias,
};
