const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const {
  getTipos,
  getTipoById,
  createTipo,
  updateTipo,
  deleteTipo,
} = require("../controllers/tiposEquipo.controller");

router.get("/", verifyToken, getTipos);
router.get("/:id", verifyToken, getTipoById);
router.post("/", verifyToken, createTipo);
router.put("/:id", verifyToken, updateTipo);
router.delete("/:id", verifyToken, deleteTipo);

module.exports = router;
