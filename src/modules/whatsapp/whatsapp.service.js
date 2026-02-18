const axios = require("axios");
const aiSeller = require("../ai_seller/aiSeller.service");
const pool = require("../../config/db");

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;

/* =========================
   ENVIO DE MENSAGEM
========================= */
async function sendMessage(phone, text) {
  try {
    await axios.post(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        phone,
        message: text
      }
    );
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.response?.data || err.message);
  }
}

/* =========================
   PROCESSAR MENSAGEM RECEBIDA
========================= */
async function handleIncomingMessage(data) {
  try {
    const phone = data.phone;
    const text = data.text?.message;

    if (!phone || !text) return;

    /* =========================
       BUSCA LEAD PELO TELEFONE
    ========================== */
    let leadResult = await pool.query(
      `SELECT * FROM leads WHERE client_phone = $1`,
      [phone]
    );

    let lead = leadResult.rows[0];

    /* =========================
       SE NÃO EXISTE LEAD, CRIA
    ========================== */
    if (!lead) {
      // fallback: usar dealership padrão
      const dealershipId = 1;

      const insert = await pool.query(
        `INSERT INTO leads
         (dealership_id, client_name, client_phone, status, origin, created_at)
         VALUES ($1, 'Lead WhatsApp', $2, 'new', 'whatsapp', NOW())
         RETURNING *`,
        [dealershipId, phone]
      );

      lead = insert.rows[0];

      // cria estado da IA
      await pool.query(
        `INSERT INTO lead_ai_state
         (dealership_id, lead_id, stage, created_at, updated_at)
         VALUES ($1,$2,'new',NOW(),NOW())
         ON CONFLICT (lead_id) DO NOTHING`,
        [dealershipId, lead.id]
      );
    }

    /* =========================
       ENVIA PARA O VENDEDOR IA
    ========================== */
    const result = await aiSeller.handleMessage(lead.id, text);

    /* =========================
       ENVIA RESPOSTA
    ========================== */
    if (result?.reply) {
      await sendMessage(phone, result.reply);
    }

  } catch (err) {
    console.error("Erro no processamento WhatsApp:", err);
  }
}

module.exports = {
  handleIncomingMessage
};
