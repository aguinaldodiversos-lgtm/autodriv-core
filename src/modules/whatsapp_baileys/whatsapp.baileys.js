const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const P = require("pino");
const QRCode = require("qrcode");

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Exibe QR como link
    if (qr) {
      const qrImage = await QRCode.toDataURL(qr);

      console.log("==================================");
      console.log("📲 ESCANEIE O QR CODE NO WHATSAPP");
      console.log("Abra este link no navegador:");
      console.log(qrImage);
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

      if (shouldReconnect) {
        setTimeout(() => startWhatsApp(), 3000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

module.exports = {
  startWhatsApp
};
