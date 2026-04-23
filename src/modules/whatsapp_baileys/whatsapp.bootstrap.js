const { startWhatsApp } = require("./whatsapp.baileys");

/**
 * IDs das lojas com sessão Baileys neste processo.
 * Ex.: WHATSAPP_DEALERSHIP_IDS=1 ou WHATSAPP_DEALERSHIP_IDS=1,2,3
 * Alternativa legada: WHATSAPP_DEALERSHIP_ID=1
 */
function parseDealershipIds() {
  const raw =
    process.env.WHATSAPP_DEALERSHIP_IDS ||
    process.env.WHATSAPP_DEALERSHIP_ID ||
    "";
  if (!String(raw).trim()) return [];
  return String(raw)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function startWhatsAppForConfiguredDealerships() {
  const ids = parseDealershipIds();
  if (!ids.length) {
    console.log(
      "[whatsapp] WHATSAPP_DEALERSHIP_IDS não definido — Baileys não iniciado (API continua ativa)."
    );
    return;
  }

  for (const id of ids) {
    await startWhatsApp(id);
  }
}

module.exports = {
  startWhatsAppForConfiguredDealerships,
  parseDealershipIds
};
