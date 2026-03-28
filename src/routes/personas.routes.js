const express = require("express");
const router = express.Router();
const {
  getPersonas,
  getPersonaById,
  createPersona,
  updatePersona,
  createDepartamento,
  getDepartamentos,
} = require("../controllers/personas.controller");

router.get("/departamentos", getDepartamentos);
router.post("/departamentos", createDepartamento);
router.get("/", getPersonas);
router.get("/:id", getPersonaById);
router.post("/", createPersona);
router.put("/:id", updatePersona);

module.exports = router;
