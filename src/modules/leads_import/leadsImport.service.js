const pool = require("../../config/db");
const { parse } = require("csv-parse/sync");

function parseLeadRows(csvBuffer) {
  const csvText = csvBuffer.toString("utf8");

  return parse(csvText, {
    columns: true,
    skip_empty_lines: true
  })
    .map((row) => ({
      client_name: row.name || row.nome || null,
      client_phone: row.phone || row.telefone || null
    }))
    .filter((row) => row.client_phone);
}

async function importLeads(csvBuffer, user) {
  const dealershipId = user.dealership_id;
  const rows = parseLeadRows(csvBuffer);

  if (!rows.length) {
    return { total: 0, leads: [] };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [];
    const placeholders = rows.map((row, index) => {
      const offset = index * 3;
      values.push(dealershipId, row.client_name, row.client_phone);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, 'import', 'new', NOW())`;
    });

    const leadResult = await client.query(
      `INSERT INTO leads
       (dealership_id, client_name, client_phone, origin, status, created_at)
       VALUES ${placeholders.join(", ")}
       RETURNING *`,
      values
    );

    const leadIds = leadResult.rows.map((lead) => lead.id);

    await client.query(
      `INSERT INTO lead_ai_state
       (dealership_id, lead_id, stage, created_at, updated_at)
       SELECT $1, lead_id, 'new', NOW(), NOW()
       FROM unnest($2::int[]) AS lead_id
       ON CONFLICT (lead_id) DO NOTHING`,
      [dealershipId, leadIds]
    );

    await client.query("COMMIT");

    return {
      total: leadResult.rows.length,
      leads: leadResult.rows
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  importLeads,
  parseLeadRows
};
