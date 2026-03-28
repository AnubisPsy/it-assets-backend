const express = require("express");
const router = express.Router();
const {
  getEntregas,
  createEntrega,
} = require("../controllers/entregas.controller");

router.get("/", getEntregas);
router.post("/", createEntrega);

module.exports = router;
