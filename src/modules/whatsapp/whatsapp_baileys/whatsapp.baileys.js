const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const aiSeller = require("../ai_seller/aiSeller.service");
const pool = require("../../config/db");

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    "./whatsapp-session"
  );

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        startWhatsApp();
      }
    }

    if (connection === "open") {
      console.log("WhatsApp conectado com sucesso.");
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    try {
      const message = msg.messages[0];

      if (!message.message) return;
      if (message.key.fromMe) return;

      const phone = message.key.remoteJid.replace("@s.whatsapp.net", "");
      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text;

      if (!text) return;

      console.log("Mensagem recebida:", phone, text);

      /* =========================
         BUSCA LEAD
      ========================== */
      let leadResult = await pool.query(
        `SELECT * FROM leads WHERE phone = $1 LIMIT 1`,
        [phone]
      );

      let lead = leadResult.rows[0];

      if (!lead) {
        const insert = await pool.query(
          `INSERT INTO leads
           (dealership_id, name, phone, source, status)
           VALUES (1, 'Lead WhatsApp', $1, 'whatsapp', 'new')
           RETURNING *`,
          [phone]
        );

        lead = insert.rows[0];
      }

      /* =========================
         IA RESPONDE
      ========================== */
      const result = await aiSeller.handleMessage(lead.id, text);

      /* =========================
         ENVIA RESPOSTA
      ========================== */
      await sock.sendMessage(message.key.remoteJid, {
        text: result.reply
      });
    } catch (err) {
      console.error("Erro no WhatsApp:", err);
    }
  });
}

module.exports = {
  startWhatsApp
};
