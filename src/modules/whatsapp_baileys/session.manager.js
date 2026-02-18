const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const path = require("path");

const sessions = new Map();

/* =====================================================
   INICIAR SESSÃO POR LOJA
===================================================== */
async function startSession(dealershipId) {
  if (sessions.has(dealershipId)) {
    return sessions.get(dealershipId);
  }

  const authFolder = path.join(
    __dirname,
    "sessions",
    String(dealershipId)
  );

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`✅ WhatsApp conectado - Loja ${dealershipId}`);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        `❌ Loja ${dealershipId} desconectada. Reconectar:`,
        shouldReconnect
      );

      if (shouldReconnect) {
        startSession(dealershipId);
      } else {
        sessions.delete(dealershipId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sessions.set(dealershipId, sock);

  return sock;
}

/* =====================================================
   OBTER SESSÃO
===================================================== */
function getSession(dealershipId) {
  return sessions.get(dealershipId);
}

/* =====================================================
   STATUS
===================================================== */
function isConnected(dealershipId) {
  return sessions.has(dealershipId);
}

module.exports = {
  startSession,
  getSession,
  isConnected
};
