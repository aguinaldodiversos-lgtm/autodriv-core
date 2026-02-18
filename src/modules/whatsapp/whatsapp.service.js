const axios = require("axios");
const aiSeller = require("../ai_seller/aiSeller.service");
const pool = require("../../config/db");

async function sendMessage(instance, phone, text) {
  await axios.post(
    `https://api.z-api.io/instances/${instance.zapi_instance}/token/${instance.zapi_token}/send-text`,
    {
      phone,
      message: text
    }
  );
}

async function handleIncomingMessage(data) {
  const phone = data.phone;
  const text = data.text?.message;

  if (!phone || !text) return;

  /* =========================
     BUSCA INSTÂNCIA PELO NÚMERO
  ========================== */
  const instanceResult = await pool.query(
    `SELECT * FROM whatsapp_instances
     WHERE phone_number = $1`,
    [data.instance?.phone || phone]
  );

  const instance = instanceResult.rows[0];

  if (!instance) {
    console.log("Instância não encontrada para:", phone);
    return;
  }

  const dealershipId = instance.dealership_id;

  /* =========================
     BUSCA LEAD PELO TELEFONE
  ========================== */
  let leadResult = await pool.query(
    `SELECT * FROM leads
     WHERE phone = $1
     AND dealership_id = $2`,
    [phone, dealershipId]
  );

  let lead = leadResult.rows[0];

  /* =========================
     SE NÃO EXISTE LEAD, CRIA
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
  }

  /* =========================
     ENVIA PARA IA
  ========================== */
  const result = await aiSeller.handleMessage(lead.id, text);

  /* =========================
     ENVIA RESPOSTA PARA WHATSAPP
  ========================== */
  await sendMessage(instance, phone, result.reply);
}

module.exports = {
  handleIncomingMessage
};
