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
  subirDocumentoFirmado,
  verificarDocumento,
} = require("../controllers/asignaciones.controller");
const upload = require("../config/multer");

router.get("/buscar/resultados", buscar);
router.get("/historial/equipo/:equipo_id", getHistorialByEquipo);
router.get("/historial/persona/:persona_id", getHistorialByPersona);
router.get("/", getAsignaciones);
router.get("/:id", getAsignacionById);
router.post("/", createAsignacion);
router.put("/:id/devolucion", registrarDevolucion);
router.post(
  "/:id/documento",
  upload.single("documento"),
  subirDocumentoFirmado,
);
router.get("/:id/documento/verificar", verificarDocumento);

module.exports = router;
