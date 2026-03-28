const express = require("express");
const router = express.Router();
const {
  getInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  getCategorias,
} = require("../controllers/insumos.controller");

router.get("/categorias", getCategorias);
router.get("/", getInsumos);
router.get("/:id", getInsumoById);
router.post("/", createInsumo);
router.put("/:id", updateInsumo);

module.exports = router;
