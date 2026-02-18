const pool = require("../../config/db");
const aiSeller = require("../ai_seller/aiSeller.service");

function normalizePhone(jid) {
  return jid.replace("@s.whatsapp.net", "");
}

async function sendMessage(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

async function handleIncomingMessage(sock, jid, text) {
  const phone = normalizePhone(jid);

  console.log("📩 Mensagem recebida:", phone, text);

  /* =========================
     IDENTIFICA INSTÂNCIA
  ========================== */
  const instanceResult = await pool.query(
    `SELECT * FROM whatsapp_instances
     WHERE phone = $1
     LIMIT 1`,
    [phone]
  );

  const instance = instanceResult.rows[0];

  if (!instance) {
    console.log("⚠️ Número não vinculado a nenhuma loja:", phone);
    return;
  }

  const dealershipId = instance.dealership_id;

  /* =========================
     BUSCA LEAD
  ========================== */
  let result = await pool.query(
    `SELECT * FROM leads
     WHERE phone = $1
     AND dealership_id = $2`,
    [phone, dealershipId]
  );

  let lead = result.rows[0];

  /* =========================
     CRIA LEAD SE NÃO EXISTIR
  ========================== */
  if (!lead) {
    const insert = await pool.query(
      `INSERT INTO leads
       (dealership_id, name, phone, source, status)
       VALUES ($1, 'Lead WhatsApp', $2, 'whatsapp', 'new')
       RETURNING *`,
      [dealershipId, phone]
    );

    lead = insert.rows[0];
    console.log("🆕 Lead criado:", lead.id);
  }

  /* =========================
     ENVIA PARA IA
  ========================== */
  const resultAI = await aiSeller.handleMessage(lead.id, text);

  /* =========================
     RESPONDE NO WHATSAPP
  ========================== */
  await sendMessage(sock, jid, resultAI.reply);

  console.log("🤖 Resposta enviada:", resultAI.reply);
}

module.exports = {
  handleIncomingMessage
};
