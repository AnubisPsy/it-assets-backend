const { pool, poolConnect } = require("../config/database");
const ping = require("ping");
const net = require("net");

const SERVIDORES = [
  { id: 1, nombre: "Lynx", linkedServer: process.env.LS_LYNX },
  { id: 2, nombre: "Bartolo", linkedServer: process.env.LS_BARTOLO },
  { id: 3, nombre: "Redis Insular", linkedServer: process.env.LS_REDIS },
  { id: 4, nombre: "Centro", linkedServer: process.env.LS_CENTRO },
  { id: 5, nombre: "Satuye", linkedServer: process.env.LS_SATUYE },
  { id: 6, nombre: "Muelle", linkedServer: process.env.LS_MUELLE },
  { id: 7, nombre: "Tocoa", linkedServer: process.env.LS_TOCOA },
  { id: 8, nombre: "Caracas", linkedServer: process.env.LS_CARACAS },
  {
    id: 9,
    nombre: "ASRIEL",
    linkedServer: process.env.LS_ASRIEL,
    usePing: true,
  },
];

const BIOMETRICOS = [
  { id: 1, nombre: "Yarda SATUYE", ip: process.env.BIO_YARDA_STY },
  { id: 2, nombre: "Yarda MUELLE", ip: process.env.BIO_YARDA_MLL },
  { id: 3, nombre: "Yarda CENTRO", ip: process.env.BIO_YARDA_CENTRO },
  { id: 4, nombre: "Tienda CENTRO", ip: process.env.BIO_TIENDA_CENTRO },
  { id: 5, nombre: "Yarda DIXON", ip: process.env.BIO_YARDA_DXN },
  { id: 6, nombre: "Tienda DIXON", ip: process.env.BIO_TIENDA_DXN },
  { id: 7, nombre: "Tienda OAKRIDGE", ip: process.env.BIO_TIENDA_OAK },
  { id: 8, nombre: "CONHISA", ip: process.env.BIO_CONHISA },
  { id: 9, nombre: "Tienda TOCOA", ip: process.env.BIO_TIENDA_TOCOA },
  { id: 10, nombre: "Yarda CAYO CAMPO", ip: process.env.BIO_YARDA_CAYO_CAMPO },
  { id: 11, nombre: "Tienda GIBSON", ip: process.env.BIO_TIENDA_GIBSON },
  { id: 12, nombre: "Asriel Cuenca", ip: process.env.BIO_ASRIEL_CUENCA },
  { id: 13, nombre: "Asriel Bonito", ip: process.env.BIO_ASRIEL_BONITO },
  { id: 14, nombre: "Asriel Muelle", ip: process.env.BIO_ASRIEL_MUELLE },
];

const testLinkedServer = async (servidor) => {
  if (servidor.usePing) {
    try {
      const [vivo, tcp] = await Promise.all([
        ping.promise.probe(servidor.ip, { timeout: 5 }),
        testTCP(servidor.ip, 1433),
      ]);
      const online = vivo.alive || tcp;
      return {
        ...servidor,
        estado: online ? "online" : "offline",
        ultimo_check: new Date(),
      };
    } catch {
      return { ...servidor, estado: "offline", ultimo_check: new Date() };
    }
  }

  try {
    await poolConnect;
    await pool
      .request()
      .query(`EXEC sp_testlinkedserver N'${servidor.linkedServer}'`);
    return { ...servidor, estado: "online", ultimo_check: new Date() };
  } catch {
    return { ...servidor, estado: "offline", ultimo_check: new Date() };
  }
};

const testTCP = (ip, puerto = 4370, timeout = 5000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(puerto, ip);
  });
};

const testPing = async (biometrico) => {
  try {
    const [vivo, tcp] = await Promise.all([
      ping.promise.probe(biometrico.ip, { timeout: 5 }),
      testTCP(biometrico.ip),
    ]);
    const online = vivo.alive || tcp;
    return {
      ...biometrico,
      estado: online ? "online" : "offline",
      ultimo_check: new Date(),
    };
  } catch {
    return { ...biometrico, estado: "offline", ultimo_check: new Date() };
  }
};

const verificarTodos = async () => {
  const [servidores, biometricos] = await Promise.all([
    Promise.all(SERVIDORES.map(testLinkedServer)),
    Promise.all(BIOMETRICOS.map(testPing)),
  ]);
  return { servidores, biometricos };
};

const verificarUno = async (tipo, id) => {
  if (tipo === "biometrico") {
    const bio = BIOMETRICOS.find((b) => b.id === Number(id));
    if (!bio) return null;
    return await testPing(bio);
  } else {
    const srv = SERVIDORES.find((s) => s.id === Number(id));
    if (!srv) return null;
    return await testLinkedServer(srv);
  }
};

const getEstado = async (req, res) => {
  try {
    const resultados = await verificarTodos();
    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEstado, verificarTodos, verificarUno };
