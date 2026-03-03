const express = require("express");
const router = express.Router();
const { generarConstancia } = require("../controllers/pdf.controller");

router.get("/constancia/:id", generarConstancia);

module.exports = router;
