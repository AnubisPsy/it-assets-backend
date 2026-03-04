const express = require("express");
const router = express.Router();
const {
  login,
  crearUsuario,
  getUsuarios,
  updateUsuario,
  cambiarPassword
} = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/registro", crearUsuario);
router.get("/usuarios", getUsuarios);
router.put("/usuarios/:id", updateUsuario);
router.put('/usuarios/:id/password', cambiarPassword);

module.exports = router;
