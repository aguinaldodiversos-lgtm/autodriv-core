const pool = require("../../config/db");

async function getAlerts(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    /* =========================
       VISITAS AGENDADAS
    ========================== */
    const visits = await pool.query(
      `SELECT COUNT(*) 
       FROM tasks
       WHERE dealership_id = $1
         AND type = 'visit'
         AND status = 'pending'`,
      [dealershipId]
    );

    /* =========================
       LEADS SEM ATENDIMENTO
    ========================== */
    const leads = await pool.query(
      `SELECT COUNT(*)
       FROM leads
       WHERE dealership_id = $1
         AND status = 'new'`,
      [dealershipId]
    );

    /* =========================
       PROPOSTAS AGUARDANDO
    ========================== */
    const proposals = await pool.query(
      `SELECT COUNT(*)
       FROM proposals
       WHERE dealership_id = $1
         AND status = 'sent'`,
      [dealershipId]
    );

    /* =========================
       VEÍCULOS EM MANUTENÇÃO
    ========================== */
    const maintenance = await pool.query(
      `SELECT COUNT(*)
       FROM vehicles
       WHERE dealership_id = $1
         AND status = 'maintenance'`,
      [dealershipId]
    );

    /* =========================
       MENSALIDADE
    ========================== */
    const subscription = await pool.query(
      `SELECT status, current_period_end
       FROM subscriptions
       WHERE dealership_id = $1`,
      [dealershipId]
    );

    let billingAlert = false;

    if (subscription.rows.length) {
      const sub = subscription.rows[0];
      const now = new Date();
      const end = new Date(sub.current_period_end);

      const diffDays =
        (now - end) / (1000 * 60 * 60 * 24);

      if (diffDays > 0) {
        billingAlert = true;
      }
    }

    res.json({
      visits_scheduled: parseInt(visits.rows[0].count),
      leads_unattended: parseInt(leads.rows[0].count),
      proposals_pending: parseInt(proposals.rows[0].count),
      vehicles_in_maintenance: parseInt(maintenance.rows[0].count),
      billing_alert: billingAlert
    });

  } catch (err) {
    console.error("Erro dashboard alerts:", err);
    res.status(500).json({ error: "Erro ao carregar alertas" });
  }
}

module.exports = {
  getAlerts
};
