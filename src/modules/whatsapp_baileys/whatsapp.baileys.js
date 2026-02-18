const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const P = require("pino");

let sock = null;

async function startWhatsApp() {
  if (sock) {
    console.log("⚠️ WhatsApp já iniciado.");
    return sock;
  }

  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");

  sock = makeWASocket({
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
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("❌ Conexão fechada.");
      console.log("🔁 Reconectar:", shouldReconnect);

      sock = null;

      if (shouldReconnect) {
        setTimeout(() => startWhatsApp(), 3000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

module.exports = {
  startWhatsApp
};
