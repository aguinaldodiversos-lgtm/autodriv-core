const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const P = require("pino");

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" })
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("==================================");
      console.log("📲 ESCANEIE O QR CODE NO WHATSAPP");
      console.log("==================================");
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado com sucesso");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Conexão fechada. Reconectar:", shouldReconnect);

      if (shouldReconnect) {
        startWhatsApp();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

module.exports = {
  startWhatsApp
};
