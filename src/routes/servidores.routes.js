const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const { getEstado } = require("../controllers/servidores.controller");

router.get("/", verifyToken, getEstado);

module.exports = router;