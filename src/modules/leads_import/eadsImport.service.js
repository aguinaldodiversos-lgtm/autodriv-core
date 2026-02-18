const { parse } = require("csv-parse/sync");
const pool = require("../../config/db");

async function importLeads(buffer, user) {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });

  let created = 0;

  for (const row of records) {
    if (!row.phone) continue;

    await pool.query(
      `INSERT INTO leads
       (dealership_id,
        assigned_user_id,
        status,
        client_name,
        client_phone,
        origin,
        created_at)
       VALUES ($1,$2,'new',$3,$4,$5,NOW())`,
      [
        user.dealership_id,
        user.id,
        row.name || null,
        row.phone,
        row.origin || "import",
      ]
    );

    created++;
  }

  return {
    success: true,
    total: records.length,
    created
  };
}

module.exports = {
  importLeads
};
