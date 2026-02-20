const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const path = require("path");
const db = require("../../config/db");

const sessions = new Map();

async function updateStatus(dealershipId, status) {
  try {
    await db.query(
      `UPDATE whatsapp_instances
       SET status = $1,
           updated_at = NOW()
       WHERE dealership_id = $2`,
      [status, dealershipId]
    );
  } catch (err) {
    console.error("Erro ao atualizar status WhatsApp:", err);
  }
}

async function startSession(dealershipId) {
  if (sessions.has(dealershipId)) {
    return sessions.get(dealershipId);
  }

  const authFolder = path.join(
    __dirname,
    "sessions",
    String(dealershipId)
  );

  const { state, saveCreds } =
    await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`✅ Loja ${dealershipId} conectada`);
      await updateStatus(dealershipId, "connected");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      await updateStatus(dealershipId, "disconnected");

      if (shouldReconnect) {
        console.log("🔁 Reconectando...");
        startSession(dealershipId);
      } else {
        sessions.delete(dealershipId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sessions.set(dealershipId, sock);

  await updateStatus(dealershipId, "connecting");

  return sock;
}

function getSession(dealershipId) {
  return sessions.get(dealershipId);
}

function isConnected(dealershipId) {
  return sessions.has(dealershipId);
}

module.exports = {
  startSession,
  getSession,
  isConnected
};
