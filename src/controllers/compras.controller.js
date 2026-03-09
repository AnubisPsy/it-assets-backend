const { pool, poolConnect, sql } = require("../config/database");
const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../uploads/compras");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const getCompras = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        c.id,
        c.descripcion,
        c.documento,
        c.fecha_compra,
        c.fecha_entrega,
        c.id_equipo,
        c.id_estado,
        e.modelo        AS equipo_descripcion,
        est.descripcion AS estado_descripcion
      FROM compras c
      LEFT JOIN equipos e   ON c.id_equipo = e.id
      LEFT JOIN estado  est ON c.id_estado = est.id
      ORDER BY c.id DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCompraById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          c.id,
          c.descripcion,
          c.documento,
          c.fecha_compra,
          c.fecha_entrega,
          c.id_equipo,
          c.id_estado,
          e.modelo        AS equipo_descripcion,
          est.descripcion AS estado_descripcion
        FROM compras c
        LEFT JOIN equipos e   ON c.id_equipo = e.id
        LEFT JOIN estado  est ON c.id_estado = est.id
        WHERE c.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const parseIntOrNull = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
};

const createCompra = async (req, res) => {
  try {
    await poolConnect;
    const { descripcion, fecha_compra, fecha_entrega, id_equipo, id_estado } =
      req.body;

    if (!id_estado) {
      return res.status(400).json({ error: "El estado es requerido" });
    }

    const documentoPath = req.file
      ? `/uploads/compras/${req.file.filename}`
      : null;

    const result = await pool
      .request()
      .input("descripcion",   sql.NVarChar(sql.MAX), descripcion             || null)
      .input("documento",     sql.NVarChar(sql.MAX), documentoPath           || null)
      .input("fecha_compra",  sql.Date,              fecha_compra            || null)
      .input("fecha_entrega", sql.Date,              fecha_entrega           || null)
      .input("id_equipo",     sql.Int,               parseIntOrNull(id_equipo))
      .input("id_estado",     sql.Int,               parseIntOrNull(id_estado))
      .query(`
        INSERT INTO compras (descripcion, documento, fecha_compra, fecha_entrega, id_equipo, id_estado)
        OUTPUT INSERTED.*
        VALUES (@descripcion, @documento, @fecha_compra, @fecha_entrega, @id_equipo, @id_estado)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: err.message });
  }
};

const updateCompra = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { descripcion, fecha_compra, fecha_entrega, id_equipo, id_estado } =
      req.body;

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
      if (documentoPath) {
        const rutaAbsoluta = path.join(__dirname, "..", documentoPath);
        fs.unlink(rutaAbsoluta, () => {});
      }
      documentoPath = nuevaRuta;
    } else if (req.body.documento === "" || req.body.documento === null) {
      if (documentoPath) {
        const rutaAbsoluta = path.join(__dirname, "..", documentoPath);
        fs.unlink(rutaAbsoluta, () => {});
      }
      documentoPath = null;
    }

    const result = await pool
      .request()
      .input("id",            sql.Int,               parseIntOrNull(id))
      .input("descripcion",   sql.NVarChar(sql.MAX), descripcion             || null)
      .input("documento",     sql.NVarChar(sql.MAX), documentoPath           || null)
      .input("fecha_compra",  sql.Date,              fecha_compra            || null)
      .input("fecha_entrega", sql.Date,              fecha_entrega           || null)
      .input("id_equipo",     sql.Int,               parseIntOrNull(id_equipo))
      .input("id_estado",     sql.Int,               parseIntOrNull(id_estado))
      .query(`
        UPDATE compras
        SET descripcion   = @descripcion,
            documento     = @documento,
            fecha_compra  = @fecha_compra,
            fecha_entrega = @fecha_entrega,
            id_equipo     = @id_equipo,
            id_estado     = @id_estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getCompras, getCompraById, createCompra, updateCompra };