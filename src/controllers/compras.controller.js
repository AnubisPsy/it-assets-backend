const { pool, poolConnect, sql } = require("../config/database");
const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../uploads/compras");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const parseIntOrNull = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
};

const getCompras = async (req, res) => {
  try {
    await poolConnect;
    const compras = await pool.request().query(`
      SELECT
        c.id, c.descripcion, c.documento, c.fecha_compra, c.id_estado,
        est.descripcion AS estado_descripcion
      FROM compras c
      LEFT JOIN estado_compras est ON c.id_estado = est.id
      ORDER BY c.id DESC
    `);

    const detalle = await pool.request().query(`
      SELECT
        cd.*,
        i.nombre AS insumo_nombre,
        i.categoria
      FROM compra_detalle cd
      LEFT JOIN insumos i ON cd.id_insumo = i.id
    `);

    const result = compras.recordset.map((c) => ({
      ...c,
      items: detalle.recordset.filter((d) => d.compra_id === c.id),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCompraById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;

    const compra = await pool.request().input("id", sql.Int, id).query(`
      SELECT
        c.id, c.descripcion, c.documento, c.fecha_compra, c.id_estado,
        est.descripcion AS estado_descripcion
      FROM compras c
      LEFT JOIN estado_compras est ON c.id_estado = est.id
      WHERE c.id = @id
    `);

    if (compra.recordset.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    const detalle = await pool.request().input("id", sql.Int, id).query(`
      SELECT cd.*, i.nombre AS insumo_nombre, i.categoria
      FROM compra_detalle cd
      LEFT JOIN insumos i ON cd.id_insumo = i.id
      WHERE cd.compra_id = @id
    `);

    res.json({ ...compra.recordset[0], items: detalle.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCompra = async (req, res) => {
  try {
    await poolConnect;
    const { descripcion, fecha_compra, id_estado, items } = req.body;

    if (!id_estado) {
      return res.status(400).json({ error: "El estado es requerido" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Debes agregar al menos un ítem" });
    }

    const documentoPath = req.file
      ? `/uploads/compras/${req.file.filename}`
      : null;

    // Crear compra
    const result = await pool
      .request()
      .input("descripcion", sql.NVarChar(500), descripcion || null)
      .input("documento", sql.NVarChar(500), documentoPath || null)
      .input("fecha_compra", sql.Date, fecha_compra || null)
      .input("id_estado", sql.Int, parseIntOrNull(id_estado)).query(`
        INSERT INTO compras (descripcion, documento, fecha_compra, id_estado)
        OUTPUT INSERTED.*
        VALUES (@descripcion, @documento, @fecha_compra, @id_estado)
      `);

    const compraId = result.recordset[0].id;

    // Insertar ítems
    for (const item of items) {
      await pool
        .request()
        .input("compra_id", sql.Int, compraId)
        .input("tipo", sql.VarChar(10), item.tipo)
        .input("descripcion", sql.VarChar(300), item.descripcion || null)
        .input("cantidad", sql.Int, item.cantidad || 1).query(`
          INSERT INTO compra_detalle (compra_id, tipo, descripcion, cantidad)
          VALUES (@compra_id, @tipo, @descripcion, @cantidad)
        `);
    }

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
};

const updateCompra = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { descripcion, fecha_compra, id_estado } = req.body;

    const actual = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT documento FROM compras WHERE id = @id");

    if (actual.recordset.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    let documentoPath = actual.recordset[0].documento;

    if (req.file) {
      const nuevaRuta = `/uploads/compras/${req.file.filename}`;
      if (documentoPath)
        fs.unlink(path.join(__dirname, "..", documentoPath), () => {});
      documentoPath = nuevaRuta;
    } else if (req.body.documento === "" || req.body.documento === null) {
      if (documentoPath)
        fs.unlink(path.join(__dirname, "..", documentoPath), () => {});
      documentoPath = null;
    }

    const result = await pool
      .request()
      .input("id", sql.Int, parseIntOrNull(id))
      .input("descripcion", sql.NVarChar(500), descripcion || null)
      .input("documento", sql.NVarChar(500), documentoPath || null)
      .input("fecha_compra", sql.Date, fecha_compra || null)
      .input("id_estado", sql.Int, parseIntOrNull(id_estado)).query(`
        UPDATE compras
        SET descripcion   = @descripcion,
            documento     = @documento,
            fecha_compra  = @fecha_compra,
            id_estado     = @id_estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
};

const recibirItem = async (req, res) => {
  try {
    await poolConnect;
    const { id, item_id } = req.params;
    const { id_insumo, cantidad_recibida, equipo } = req.body;

    const itemCheck = await pool
      .request()
      .input("item_id", sql.Int, item_id)
      .input("compra_id", sql.Int, id)
      .query(
        "SELECT * FROM compra_detalle WHERE id = @item_id AND compra_id = @compra_id",
      );

    if (itemCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    const item = itemCheck.recordset[0];

    if (item.recibido) {
      return res.status(400).json({ error: "Este ítem ya fue recibido" });
    }

    if (item.tipo === "insumo") {
      if (!id_insumo || !cantidad_recibida) {
        return res
          .status(400)
          .json({ error: "Insumo y cantidad son requeridos" });
      }

      await pool
        .request()
        .input("id_insumo", sql.Int, id_insumo)
        .input("cantidad_recibida", sql.Int, cantidad_recibida)
        .query(
          "UPDATE insumos SET stock = stock + @cantidad_recibida WHERE id = @id_insumo",
        );

      await pool
        .request()
        .input("item_id", sql.Int, item_id)
        .input("id_insumo", sql.Int, id_insumo)
        .query(
          "UPDATE compra_detalle SET recibido = 1, id_insumo = @id_insumo, fecha_recepcion = GETDATE() WHERE id = @item_id",
        );
    }

    if (item.tipo === "equipo") {
      if (
        !equipo ||
        !equipo.tipo_id ||
        !equipo.marca ||
        !equipo.modelo ||
        !equipo.serie
      ) {
        return res.status(400).json({ error: "Datos del equipo incompletos" });
      }

      const resEquipo = await pool
        .request()
        .input("tipo_id", sql.Int, equipo.tipo_id)
        .input("marca", sql.VarChar(100), equipo.marca)
        .input("modelo", sql.VarChar(150), equipo.modelo)
        .input("serie", sql.VarChar(100), equipo.serie)
        .input("procesador", sql.VarChar(100), equipo.procesador || null)
        .input("ram", sql.VarChar(50), equipo.ram || null)
        .input("descripcion", sql.VarChar(300), equipo.descripcion || null)
        .input("mac", sql.VarChar(50), equipo.mac || null).query(`
          INSERT INTO equipos (tipo_id, marca, modelo, serie, procesador, ram, descripcion, mac, estado_id)
          OUTPUT INSERTED.*
          VALUES (@tipo_id, @marca, @modelo, @serie, @procesador, @ram, @descripcion, @mac, 1)
        `);

      const nuevoEquipo = resEquipo.recordset[0];

      await pool
        .request()
        .input("item_id", sql.Int, item_id)
        .input("id_equipo", sql.Int, nuevoEquipo.id)
        .query(
          "UPDATE compra_detalle SET recibido = 1, id_equipo = @id_equipo WHERE id = @item_id",
        );
    }

    // Verificar si todos los ítems están recibidos para actualizar estado de compra
    const pendientes = await pool
      .request()
      .input("compra_id", sql.Int, id)
      .query(
        "SELECT COUNT(*) AS total FROM compra_detalle WHERE compra_id = @compra_id AND recibido = 0",
      );

    const totalPendientes = pendientes.recordset[0].total;

    const nuevoEstado =
      totalPendientes === 0 ? "entregado" : "entregado parcial";

    await pool
      .request()
      .input("compra_id", sql.Int, id)
      .input("nuevoEstado", sql.VarChar(50), nuevoEstado).query(`
        UPDATE compras
        SET id_estado = (SELECT id FROM estado_compras WHERE descripcion = @nuevoEstado)
        WHERE id = @compra_id
      `);

    res.json({ mensaje: "Ítem recibido correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEstadosCompras = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query("SELECT * FROM estado_compras");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCompras,
  getCompraById,
  createCompra,
  updateCompra,
  recibirItem,
  getEstadosCompras,
};
