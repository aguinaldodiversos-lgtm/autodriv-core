const pool = require("../../config/db");
const { buildFollowupScript } = require("./followup.script");

function getFollowupMode(source) {
  return source === "manual" || source === "import" ? "late" : "full";
}

async function scheduleLeadFollowups(lead, source = "system") {
  const script = buildFollowupScript(lead, getFollowupMode(source));
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM lead_followups
       WHERE lead_id = $1
         AND sent_at IS NULL`,
      [lead.id]
    );

    if (script.length) {
      const values = [];
      const placeholders = script.map((step, index) => {
        const offset = index * 4;
        values.push(lead.dealership_id, lead.id, step.message, step.scheduled_at);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      });

      await client.query(
        `INSERT INTO lead_followups
         (dealership_id, lead_id, message, scheduled_at)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelLeadFollowups(leadId) {
  await pool.query(
    `DELETE FROM lead_followups
     WHERE lead_id = $1
       AND sent_at IS NULL`,
    [leadId]
  );
}

module.exports = {
  scheduleLeadFollowups,
  cancelLeadFollowups,
  getFollowupMode
};
