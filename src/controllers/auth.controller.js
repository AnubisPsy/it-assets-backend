const { pool, poolConnect, sql } = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    await poolConnect;
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res
        .status(400)
        .json({ error: "Usuario y contraseña son requeridos" });
    }

    const result = await pool
      .request()
      .input("usuario", sql.VarChar(50), usuario)
      .query("SELECT * FROM usuarios WHERE usuario = @usuario AND activo = 1");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = result.recordset[0];
    const passwordValida = await bcrypt.compare(password, user.password);

    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      debe_cambiar_password: user.debe_cambiar_password,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const crearUsuario = async (req, res) => {
  try {
    await poolConnect;
    const { nombre, usuario, password } = req.body;

    if (!nombre || !usuario || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, usuario y contraseña son requeridos" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("nombre", sql.VarChar(150), nombre)
      .input("usuario", sql.VarChar(50), usuario)
      .input("password", sql.VarChar(255), hash).query(`
                INSERT INTO usuarios (nombre, usuario, password)
                OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.usuario, INSERTED.fecha_registro
                VALUES (@nombre, @usuario, @password)
            `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ error: err.message });
  }
};

const getUsuarios = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query(
        "SELECT id, nombre, usuario, activo, fecha_registro FROM usuarios ORDER BY nombre",
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUsuario = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { nombre, usuario, password, activo } = req.body;

    let query;
    const request = pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(150), nombre)
      .input("usuario", sql.VarChar(50), usuario)
      .input("activo", sql.Bit, activo);

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      request.input("password", sql.VarChar(255), hash);
      query = `
                UPDATE usuarios
                SET nombre = @nombre, usuario = @usuario, password = @password, activo = @activo
                OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.usuario, INSERTED.activo
                WHERE id = @id
            `;
    } else {
      query = `
                UPDATE usuarios
                SET nombre = @nombre, usuario = @usuario, activo = @activo
                OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.usuario, INSERTED.activo
                WHERE id = @id
            `;
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ error: err.message });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "La contraseña es requerida" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("password", sql.VarChar(255), hash).query(`
                UPDATE usuarios
                SET password = @password, debe_cambiar_password = 0
                WHERE id = @id
            `);

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login, crearUsuario, getUsuarios, updateUsuario, cambiarPassword };
