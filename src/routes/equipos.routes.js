const express = require("express");
const router = express.Router();
const {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  getEstados,
} = require("../controllers/equipos.controller");

router.get("/estados", getEstados);
router.get("/", getEquipos);
router.get("/:id", getEquipoById);
router.post("/", createEquipo);
router.put("/:id", updateEquipo);

module.exports = router;
