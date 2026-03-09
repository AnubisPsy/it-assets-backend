const { pool, poolConnect, sql } = require("../config/database");

const SERVIDORES = [
  { id: 1, nombre: "Lynx", linkedServer: process.env.LS_LYNX },
  { id: 2, nombre: "Bartolo", linkedServer: process.env.LS_BARTOLO },
  { id: 3, nombre: "Redis Insular", linkedServer: process.env.LS_REDIS },
  { id: 4, nombre: "Centro", linkedServer: process.env.LS_CENTRO },
  { id: 5, nombre: "Satuye", linkedServer: process.env.LS_SATUYE },
  { id: 6, nombre: "Muelle", linkedServer: process.env.LS_MUELLE },
  { id: 7, nombre: "Tocoa", linkedServer: process.env.LS_TOCOA },
  { id: 8, nombre: "Caracas", linkedServer: process.env.LS_CARACAS },
];

/*const testLinkedServer = async (servidor) => {
  try {
    await poolConnect;
    await pool
      .request()
      .query(
        `SELECT TOP 1 1 FROM [${servidor.linkedServer}].master.dbo.sysdatabases`,
      );
    return { ...servidor, estado: "online", ultimo_check: new Date() };
  } catch {
    return { ...servidor, estado: "offline", ultimo_check: new Date() };
  }
}; */

const testLinkedServer = async (servidor) => {
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

const verificarTodos = async () => {
  return await Promise.all(SERVIDORES.map(testLinkedServer));
};

const verificarUno = async (id) => {
  const servidor = SERVIDORES.find((s) => s.id === Number(id));
  if (!servidor) return null;
  return await testLinkedServer(servidor);
};

const getEstado = async (req, res) => {
  try {
    const resultados = await Promise.all(SERVIDORES.map(testLinkedServer));
    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEstado, verificarTodos, verificarUno };
