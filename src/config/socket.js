let io;
const init = (ioInstance) => { io = ioInstance; };
const getIO = () => io;
module.exports = { init, getIO };
