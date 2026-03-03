const express = require("express");
const router = express.Router();
const { login, crearUsuario } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/registro", crearUsuario);

module.exports = router;
