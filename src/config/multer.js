const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/documentos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreBase = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );
    const nombre = `${nombreBase}_firmado${ext}`;
    cb(null, nombre);
  },
});

const fileFilter = (req, file, cb) => {
  const permitidos = ["application/pdf", "image/jpeg", "image/png"];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten PDF, JPG o PNG"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
