const pool = require("../../config/db");
const aiSeller = require("../ai_seller/aiSeller.service");

/* =========================
   NORMALIZA TELEFONE
========================= */
function normalizePhone(jid) {
  return jid.replace("@s.whatsapp.net", "");
}

/* =========================
   ENVIA MENSAGEM
========================= */
async function sendMessage(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

/* =========================
   PROCESSA MENSAGEM
========================= */
async function handleIncomingMessage(sock, jid, text) {
  const phone = normalizePhone(jid);

  console.log("📩 Mensagem recebida:", phone, text);

  /* =========================
     BUSCA LEAD
  ========================== */
  let result = await pool.query(
    `SELECT * FROM leads WHERE phone = $1`,
    [phone]
  );

  let lead = result.rows[0];

  /* =========================
     CRIA LEAD SE NÃO EXISTIR
  ========================== */
  if (!lead) {
    const insert = await pool.query(
      `INSERT INTO leads
       (dealership_id, name, phone, source, status)
       VALUES (1, 'Lead WhatsApp', $1, 'whatsapp', 'new')
       RETURNING *`,
      [phone]
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
