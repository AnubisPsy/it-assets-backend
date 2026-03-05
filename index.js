const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./src/config/database");

const authRoutes = require("./src/routes/auth.routes");
const personasRoutes = require("./src/routes/personas.routes");
const equiposRoutes = require("./src/routes/equipos.routes");
const asignacionesRoutes = require("./src/routes/asignaciones.routes");
const authMiddleware = require("./src/middlewares/auth.middleware");
const pdfRoutes = require("./src/routes/pdf.routes");
const tiposEquipoRoutes = require("./src/routes/tiposEquipos.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const path = require("path");

app.use("/api/auth", authRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(authMiddleware);

app.use("/api/personas", personasRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/asignaciones", asignacionesRoutes);
app.use("/api/pdf", pdfRoutes);
app.use(
  "/uploads/fotos",
  express.static(path.join(__dirname, "../uploads/fotos")),
);
app.use("/api/tipos-equipo", tiposEquipoRoutes);

app.get("/", (req, res) => {
  res.json({ mensaje: "IT Assets API funcionando" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
