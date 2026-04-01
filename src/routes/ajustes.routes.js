const express = require("express");
const router = express.Router();
const {
  getAjustes,
  getAjustesByInsumo,
  createAjuste,
} = require("../controllers/ajustes.controller");

router.get("/", getAjustes);
router.get("/insumo/:id", getAjustesByInsumo);
router.post("/", createAjuste);

module.exports = router;
