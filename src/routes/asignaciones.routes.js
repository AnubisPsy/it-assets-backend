const express = require("express");
const router = express.Router();
const {
  getAsignaciones,
  getAsignacionById,
  getHistorialByEquipo,
  getHistorialByPersona,
  createAsignacion,
  registrarDevolucion,
  buscar,
} = require("../controllers/asignaciones.controller");

router.get("/buscar/resultados", buscar);
router.get("/historial/equipo/:equipo_id", getHistorialByEquipo);
router.get("/historial/persona/:persona_id", getHistorialByPersona);
router.get("/", getAsignaciones);
router.get("/:id", getAsignacionById);
router.post("/", createAsignacion);
router.put("/:id/devolucion", registrarDevolucion);

module.exports = router;
