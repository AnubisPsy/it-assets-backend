const express = require("express");
const router = express.Router();
const { uploadFoto } = require("../config/multer");
const {
  login,
  crearUsuario,
  getUsuarios,
  updateUsuario,
  cambiarPassword,
  subirFotoPerfil,
  eliminarFotoPerfil,
} = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/registro", crearUsuario);
router.get("/usuarios", getUsuarios);
router.put("/usuarios/:id", updateUsuario);
router.put("/usuarios/:id/password", cambiarPassword);
router.post("/usuarios/:id/foto", uploadFoto.single("foto"), subirFotoPerfil);
router.delete("/usuarios/:id/foto", eliminarFotoPerfil);

module.exports = router;
