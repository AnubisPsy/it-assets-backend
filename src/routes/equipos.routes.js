const express = require("express");
const router = express.Router();
const {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  getEstados,
  getEquiposConAsignacion,
} = require("../controllers/equipos.controller");

router.get("/estados", getEstados);
router.get("/inventario", getEquiposConAsignacion);
router.get("/", getEquipos);
router.get("/:id", getEquipoById);
router.post("/", createEquipo);
router.put("/:id", updateEquipo);

module.exports = router;
