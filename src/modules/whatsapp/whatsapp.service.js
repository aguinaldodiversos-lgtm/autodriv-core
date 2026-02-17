const axios = require("axios");
const aiSeller = require("../ai_seller/aiSeller.service");
const pool = require("../../config/db");

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;

async function sendMessage(phone, text) {
  await axios.post(
    `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
    {
      phone,
      message: text
    }
  );
}

async function handleIncomingMessage(data) {
  const phone = data.phone;
  const text = data.text?.message;

  if (!text) return;

  /* =========================
     BUSCA LEAD PELO TELEFONE
  ========================== */
  let leadResult = await pool.query(
    `SELECT * FROM leads WHERE phone = $1`,
    [phone]
  );

  let lead = leadResult.rows[0];

  /* =========================
     SE NÃO EXISTE LEAD, CRIA
  ========================== */
  if (!lead) {
    const insert = await pool.query(
      `INSERT INTO leads
       (dealership_id, name, phone, status)
       VALUES (1, 'Lead WhatsApp', $1, 'new')
       RETURNING *`,
      [phone]
    );

    lead = insert.rows[0];
  }

  /* =========================
     ENVIA PARA O VENDEDOR IA
  ========================== */
  const result = await aiSeller.handleMessage(lead.id, text);

  /* =========================
     ENVIA RESPOSTA PARA WHATSAPP
  ========================== */
  await sendMessage(phone, result.reply);
}

module.exports = {
  handleIncomingMessage
};
