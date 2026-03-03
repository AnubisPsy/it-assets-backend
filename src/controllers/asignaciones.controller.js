const { pool, poolConnect, sql } = require("../config/database");

const getAsignaciones = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
            SELECT 
                a.*,
                p.nombre AS persona_nombre,
                p.numero_identidad,
                p.departamento,
                e.marca,
                e.modelo,
                e.serie,
                e.procesador,
                e.ram
            FROM asignaciones a
            JOIN personas p ON a.persona_id = p.id
            JOIN equipos e ON a.equipo_id = e.id
            ORDER BY a.fecha_registro DESC
        `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAsignacionById = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const result = await pool.request().input("id", sql.Int, id).query(`
                SELECT 
                    a.*,
                    p.nombre AS persona_nombre,
                    p.numero_identidad,
                    p.departamento,
                    e.marca,
                    e.modelo,
                    e.serie,
                    e.procesador,
                    e.ram
                FROM asignaciones a
                JOIN personas p ON a.persona_id = p.id
                JOIN equipos e ON a.equipo_id = e.id
                WHERE a.id = @id
            `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHistorialByEquipo = async (req, res) => {
  try {
    await poolConnect;
    const { equipo_id } = req.params;
    const result = await pool.request().input("equipo_id", sql.Int, equipo_id)
      .query(`
                SELECT 
                    a.*,
                    p.nombre AS persona_nombre,
                    p.departamento
                FROM asignaciones a
                JOIN personas p ON a.persona_id = p.id
                WHERE a.equipo_id = @equipo_id
                ORDER BY a.fecha_asignacion DESC
            `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHistorialByPersona = async (req, res) => {
  try {
    await poolConnect;
    const { persona_id } = req.params;
    const result = await pool.request().input("persona_id", sql.Int, persona_id)
      .query(`
                SELECT 
                    a.*,
                    e.marca,
                    e.modelo,
                    e.serie
                FROM asignaciones a
                JOIN equipos e ON a.equipo_id = e.id
                WHERE a.persona_id = @persona_id
                ORDER BY a.fecha_asignacion DESC
            `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAsignacion = async (req, res) => {
  try {
    await poolConnect;
    const { equipo_id, persona_id, fecha_asignacion, notas } = req.body;

    if (!equipo_id || !persona_id || !fecha_asignacion) {
      return res
        .status(400)
        .json({ error: "Equipo, persona y fecha son requeridos" });
    }

    // Verificar que el equipo esté disponible
    const equipoCheck = await pool
      .request()
      .input("equipo_id", sql.Int, equipo_id)
      .query(`SELECT estado FROM equipos WHERE id = @equipo_id`);

    if (equipoCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    if (equipoCheck.recordset[0].estado !== "disponible") {
      return res
        .status(400)
        .json({ error: "El equipo no está disponible para asignar" });
    }

    // Crear la asignación y actualizar el estado del equipo
    const result = await pool
      .request()
      .input("equipo_id", sql.Int, equipo_id)
      .input("persona_id", sql.Int, persona_id)
      .input("fecha_asignacion", sql.Date, fecha_asignacion)
      .input("notas", sql.VarChar(500), notas || null).query(`
                INSERT INTO asignaciones (equipo_id, persona_id, fecha_asignacion, notas)
                OUTPUT INSERTED.*
                VALUES (@equipo_id, @persona_id, @fecha_asignacion, @notas)
            `);

    await pool
      .request()
      .input("equipo_id", sql.Int, equipo_id)
      .query(`UPDATE equipos SET estado = 'asignado' WHERE id = @equipo_id`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const registrarDevolucion = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { fecha_devolucion } = req.body;

    if (!fecha_devolucion) {
      return res
        .status(400)
        .json({ error: "La fecha de devolución es requerida" });
    }

    const asignacionCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM asignaciones WHERE id = @id`);

    if (asignacionCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    if (!asignacionCheck.recordset[0].activa) {
      return res.status(400).json({ error: "Esta asignación ya fue cerrada" });
    }

    const equipo_id = asignacionCheck.recordset[0].equipo_id;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("fecha_devolucion", sql.Date, fecha_devolucion).query(`
                UPDATE asignaciones
                SET fecha_devolucion = @fecha_devolucion, activa = 0
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

    await pool
      .request()
      .input("equipo_id", sql.Int, equipo_id)
      .query(`UPDATE equipos SET estado = 'disponible' WHERE id = @equipo_id`);

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const buscar = async (req, res) => {
  try {
    await poolConnect;
    //console.log("Query params:", req.query);
    const { persona, serie, fecha_desde, fecha_hasta, activa } = req.query;

    let query = `
            SELECT 
                a.*,
                p.nombre AS persona_nombre,
                p.numero_identidad,
                p.departamento,
                e.marca,
                e.modelo,
                e.serie,
                e.procesador,
                e.ram
            FROM asignaciones a
            JOIN personas p ON a.persona_id = p.id
            JOIN equipos e ON a.equipo_id = e.id
            WHERE 1=1
        `;

    const request = pool.request();

    if (persona) {
      query += ` AND (p.nombre LIKE @persona OR p.numero_identidad LIKE @persona)`;
      request.input("persona", sql.VarChar(150), `%${persona}%`);
    }

    if (serie) {
      query += ` AND e.serie LIKE @serie`;
      request.input("serie", sql.VarChar(100), `%${serie}%`);
    }

    if (fecha_desde) {
      query += ` AND a.fecha_asignacion >= @fecha_desde`;
      request.input("fecha_desde", sql.Date, fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND a.fecha_asignacion <= @fecha_hasta`;
      request.input("fecha_hasta", sql.Date, fecha_hasta);
    }

    if (activa !== undefined) {
      query += ` AND a.activa = @activa`;
      request.input("activa", sql.Bit, activa === "true" ? 1 : 0);
    }

    query += ` ORDER BY a.fecha_asignacion DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAsignaciones,
  getAsignacionById,
  getHistorialByEquipo,
  getHistorialByPersona,
  createAsignacion,
  registrarDevolucion,
  buscar,
};
