const { pool, poolConnect, sql } = require("../config/database");

const getAjustes = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        a.id,
        a.cantidad_antes,
        a.cantidad_nueva,
        a.diferencia,
        a.motivo,
        a.fecha_registro,
        i.nombre AS insumo_nombre,
        i.categoria,
        u.usuario AS ajustado_por
      FROM ajustes_inventario a
      JOIN insumos  i ON a.insumo_id  = i.id
      JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.fecha_registro DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAjustesByInsumo = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool.request().input("id", sql.Int, id).query(`
        SELECT
          a.id,
          a.cantidad_antes,
          a.cantidad_nueva,
          a.diferencia,
          a.motivo,
          a.fecha_registro,
          u.usuario AS ajustado_por
        FROM ajustes_inventario a
        JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.insumo_id = @id
        ORDER BY a.fecha_registro DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAjuste = async (req, res) => {
  try {
    await poolConnect;
    const { insumo_id, cantidad_nueva, motivo } = req.body;
    const usuario_id = req.usuario.id;

    if (!insumo_id || cantidad_nueva === undefined || cantidad_nueva === null) {
      return res
        .status(400)
        .json({ error: "Insumo y cantidad son requeridos" });
    }

    if (cantidad_nueva < 0) {
      return res
        .status(400)
        .json({ error: "La cantidad no puede ser negativa" });
    }

    if (!motivo) {
      return res.status(400).json({ error: "El motivo es requerido" });
    }

    // Obtener stock actual
    const insumoCheck = await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .query("SELECT stock FROM insumos WHERE id = @insumo_id");

    if (insumoCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    const cantidad_antes = insumoCheck.recordset[0].stock;
    const diferencia = cantidad_nueva - cantidad_antes;

    // Actualizar stock
    await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .input("cantidad_nueva", sql.Int, cantidad_nueva)
      .query(
        "UPDATE insumos SET stock = @cantidad_nueva WHERE id = @insumo_id",
      );

    // Registrar ajuste
    const result = await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .input("cantidad_antes", sql.Int, cantidad_antes)
      .input("cantidad_nueva", sql.Int, cantidad_nueva)
      .input("diferencia", sql.Int, diferencia)
      .input("motivo", sql.VarChar(300), motivo)
      .input("usuario_id", sql.Int, usuario_id).query(`
        INSERT INTO ajustes_inventario (insumo_id, cantidad_antes, cantidad_nueva, diferencia, motivo, usuario_id)
        OUTPUT INSERTED.*
        VALUES (@insumo_id, @cantidad_antes, @cantidad_nueva, @diferencia, @motivo, @usuario_id)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAjustes, getAjustesByInsumo, createAjuste };
