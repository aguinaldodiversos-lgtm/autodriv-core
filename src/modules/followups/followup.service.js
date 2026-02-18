async function scheduleLeadFollowups(lead, source = "system") {
  let mode = "full";

  // Se lead for manual ou importado
  if (source === "manual" || source === "import") {
    mode = "late";
  }

  const script = buildFollowupScript(lead, mode);

  for (const step of script) {
    await pool.query(
      `INSERT INTO lead_followups
       (dealership_id, lead_id, message, scheduled_at)
       VALUES ($1,$2,$3,$4)`,
      [
        lead.dealership_id,
        lead.id,
        step.message,
        step.scheduled_at
      ]
    );
  }
}
