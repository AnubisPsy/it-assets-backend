const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getCompras,
  getCompraById,
  createCompra,
  updateCompra,
} = require("../controllers/compras.controller");

const UPLOADS_DIR = path.join(__dirname, "../../uploads/compras");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get("/", getCompras);
router.get("/:id", getCompraById);
router.post("/", upload.single("documento"), createCompra);
router.put("/:id", upload.single("documento"), updateCompra);

module.exports = router;