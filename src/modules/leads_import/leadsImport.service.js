const pool = require("../../config/db");
const { parse } = require("csv-parse/sync");

/* =========================
   IMPORTAÇÃO DE LEADS VIA CSV
========================= */
async function importLeads(csvBuffer, user) {
  const dealershipId = user.dealership_id;

  const csvText = csvBuffer.toString("utf8");

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  });

  const inserted = [];

  for (const row of records) {
    const client_name = row.name || row.nome || null;
    const client_phone = row.phone || row.telefone || null;

    if (!client_phone) continue;

    const leadResult = await pool.query(
      `INSERT INTO leads
       (dealership_id, client_name, client_phone, origin, status, created_at)
       VALUES ($1,$2,$3,'import','new',NOW())
       RETURNING *`,
      [dealershipId, client_name, client_phone]
    );

    const lead = leadResult.rows[0];

    // cria estado da IA
    await pool.query(
      `INSERT INTO lead_ai_state
       (dealership_id, lead_id, stage, created_at, updated_at)
       VALUES ($1,$2,'new',NOW(),NOW())
       ON CONFLICT (lead_id) DO NOTHING`,
      [dealershipId, lead.id]
    );

    inserted.push(lead);
  }

  return {
    total: inserted.length,
    leads: inserted
  };
}

module.exports = {
  importLeads
};
