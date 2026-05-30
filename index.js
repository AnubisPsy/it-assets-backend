const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
require("./src/config/database");

const authRoutes = require("./src/routes/auth.routes");
const personasRoutes = require("./src/routes/personas.routes");
const equiposRoutes = require("./src/routes/equipos.routes");
const asignacionesRoutes = require("./src/routes/asignaciones.routes");
const authMiddleware = require("./src/middlewares/auth.middleware");
const pdfRoutes = require("./src/routes/pdf.routes");
const tiposEquipoRoutes = require("./src/routes/tiposEquipos.routes");
const servidoresRoutes = require("./src/routes/servidores.routes");
const comprasRoutes = require("./src/routes/compras.routes");
const estadoRoutes = require("./src/routes/estado.routes");
const insumosRoutes  = require("./src/routes/insumos.routes");
const entregasRoutes = require("./src/routes/entregas.routes");
const ajustesRoutes = require("./src/routes/ajustes.routes");
const {
  verificarTodos,
  verificarUno,
} = require("./src/controllers/servidores.controller");

const socketConfig = require("./src/config/socket");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

socketConfig.init(io);

const PORT = process.env.PORT || 3000;
const INTERVALO = 10 * 1000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
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
app.use("/api/servidores", servidoresRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/estados", estadoRoutes);
app.use("/api/insumos",   insumosRoutes);
app.use("/api/entregas",  entregasRoutes);
app.use("/api/ajustes", ajustesRoutes);

app.get("/", (req, res) => {
  res.json({ mensaje: "IT Assets API funcionando" });
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  verificarTodos().then((resultados) => {
    socket.emit("estado_servidores", resultados);
  });

  socket.on("verificar_uno", async ({ tipo, id }) => {
    const resultado = await verificarUno(tipo, id);
    if (resultado) socket.emit("estado_servidor", { tipo, datos: resultado });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const correrVerificacion = async () => {
  const resultados = await verificarTodos();
  io.emit("estado_servidores", resultados);
};

setInterval(correrVerificacion, INTERVALO);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
