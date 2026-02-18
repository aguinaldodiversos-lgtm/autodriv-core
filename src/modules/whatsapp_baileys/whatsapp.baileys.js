const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const path = require("path");

const whatsappService = require("../whatsapp/whatsapp.service");
const { startSession } = require("./session.manager");

/* =====================================================
   INICIAR SESSÃO WHATSAPP (POR ENQUANTO FIXO LOJA 1)
===================================================== */
async function startWhatsApp(dealershipId = 1) {
  try {
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

    /* =============================================
       REGISTRA SESSÃO NO GERENCIADOR
    ============================================= */
    await startSession(dealershipId);

    /* =============================================
       CONEXÃO
    ============================================= */
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
          startWhatsApp(dealershipId);
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

    /* =============================================
       CAPTURA MENSAGENS RECEBIDAS
    ============================================= */
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];

        if (!msg?.message) return;

        // Ignora mensagens enviadas pelo próprio bot
        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;

        if (!remoteJid || !remoteJid.includes("@s.whatsapp.net")) return;

        const phone = remoteJid.replace("@s.whatsapp.net", "");

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          null;

        if (!text) return;

        console.log(
          `📩 Mensagem recebida da loja ${dealershipId} - ${phone}: ${text}`
        );

        await whatsappService.handleIncomingMessage({
          dealershipId,
          phone,
          text
        });

      } catch (err) {
        console.error("Erro ao processar mensagem recebida:", err);
      }
    });

  } catch (err) {
    console.error("Erro ao iniciar WhatsApp:", err);
  }
}

module.exports = {
  startWhatsApp
};
