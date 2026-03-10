const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const {
  getPersonas,
  getPersonaById,
  createPersona,
  updatePersona,
  getDepartamentos,
} = require("../controllers/personas.controller");

router.get("/departamentos", getDepartamentos);
router.get("/", getPersonas);
router.get("/:id", getPersonaById);
router.post("/", createPersona);
router.put("/:id", updatePersona);

module.exports = router;
