const { pool, poolConnect, sql } = require("../config/database");

const getEntregas = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        ei.*,
        i.nombre    AS insumo_nombre,
        i.categoria,
        p.nombre    AS persona_nombre,
        d.nombre    AS departamento,
        u.usuario   AS entregado_por
      FROM entregas_insumos ei
      JOIN insumos    i ON ei.insumo_id  = i.id
      JOIN personas   p ON ei.persona_id = p.id
      JOIN departamentos d ON p.departamento_id = d.id
      LEFT JOIN usuarios u ON ei.usuario_id = u.id
      ORDER BY ei.fecha_registro DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEntrega = async (req, res) => {
  try {
    await poolConnect;
    const { insumo_id, persona_id, cantidad, notas } = req.body;
    const usuario_id = req.usuario.id;

    if (!insumo_id || !persona_id || !cantidad) {
      return res
        .status(400)
        .json({ error: "Insumo, persona y cantidad son requeridos" });
    }

    if (cantidad <= 0) {
      return res
        .status(400)
        .json({ error: "La cantidad debe ser mayor a cero" });
    }

    // Verificar stock disponible
    const stockCheck = await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .query("SELECT stock FROM insumos WHERE id = @insumo_id");

    if (stockCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    if (stockCheck.recordset[0].stock < cantidad) {
      return res.status(400).json({ error: "Stock insuficiente" });
    }

    // Registrar entrega
    const result = await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .input("persona_id", sql.Int, persona_id)
      .input("cantidad", sql.Int, cantidad)
      .input("notas", sql.VarChar(500), notas || null)
      .input("usuario_id", sql.Int, usuario_id).query(`
        INSERT INTO entregas_insumos (insumo_id, persona_id, cantidad, notas, usuario_id)
        OUTPUT INSERTED.*
        VALUES (@insumo_id, @persona_id, @cantidad, @notas, @usuario_id)
      `);

    // Descontar stock
    await pool
      .request()
      .input("insumo_id", sql.Int, insumo_id)
      .input("cantidad", sql.Int, cantidad)
      .query(
        "UPDATE insumos SET stock = stock - @cantidad WHERE id = @insumo_id",
      );

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEntregas, createEntrega };
