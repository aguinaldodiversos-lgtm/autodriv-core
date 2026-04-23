const pool = require("../../config/db");
const { buildFollowupScript } = require("./followup.script");

async function scheduleLeadFollowups(lead, source = "system") {
  let mode = "full";

  if (source === "manual" || source === "import") {
    mode = "late";
  }

  const script = buildFollowupScript(lead, mode);

  for (const step of script) {
    await pool.query(
      `INSERT INTO lead_followups
       (dealership_id, lead_id, message, scheduled_at)
       VALUES ($1,$2,$3,$4)`,
      [lead.dealership_id, lead.id, step.message, step.scheduled_at]
    );
  }
}

async function cancelLeadFollowups(leadId) {
  await pool.query(`DELETE FROM lead_followups WHERE lead_id = $1`, [
    leadId
  ]);
}

module.exports = {
  scheduleLeadFollowups,
  cancelLeadFollowups
};
