const pool = require("../../config/db");

async function getAlerts(user) {
  const dealershipId = user.dealership_id;
  const alerts = [];

  /* =========================
     ALERTA: MENSALIDADE
  ========================= */
  const subResult = await pool.query(
    `SELECT * FROM subscriptions WHERE dealership_id = $1`,
    [dealershipId]
  );

  if (subResult.rows.length > 0) {
    const sub = subResult.rows[0];
    const now = new Date();
    const end = new Date(sub.current_period_end);

    const diffDays = Math.floor(
      (now - end) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 0 && diffDays <= 9) {
      alerts.push({
        type: "payment",
        severity: "critical",
        message: `Mensalidade em atraso. Bloqueio em ${9 - diffDays} dias.`
      });
    }

    if (diffDays > 9) {
      alerts.push({
        type: "payment",
        severity: "blocked",
        message: "Sistema bloqueado por falta de pagamento."
      });
    }
  }

  /* =========================
     ALERTA: LEADS PARADOS
  ========================= */
  const leadsResult = await pool.query(
    `
    SELECT COUNT(*) FROM leads
    WHERE dealership_id = $1
    AND status = 'new'
    AND created_at < NOW() - INTERVAL '24 hours'
    `,
    [dealershipId]
  );

  const leadsCount = parseInt(leadsResult.rows[0].count);

  if (leadsCount > 0) {
    alerts.push({
      type: "lead",
      severity: "warning",
      message: `${leadsCount} leads sem atendimento há mais de 24h`
    });
  }

  /* =========================
     ALERTA: PROPOSTAS PARADAS
  ========================= */
  const proposalsResult = await pool.query(
    `
    SELECT COUNT(*) FROM proposals
    WHERE dealership_id = $1
    AND status = 'open'
    AND created_at < NOW() - INTERVAL '3 days'
    `,
    [dealershipId]
  );

  const proposalsCount = parseInt(proposalsResult.rows[0].count);

  if (proposalsCount > 0) {
    alerts.push({
      type: "proposal",
      severity: "warning",
      message: `${proposalsCount} propostas aguardando resposta há mais de 3 dias`
    });
  }

  /* =========================
     ALERTA: CONTAS VENCIDAS
  ========================= */
  const financeResult = await pool.query(
    `
    SELECT COUNT(*) FROM financial_transactions
    WHERE dealership_id = $1
    AND status = 'pending'
    AND due_date < CURRENT_DATE
    `,
    [dealershipId]
  );

  const overdueCount = parseInt(financeResult.rows[0].count);

  if (overdueCount > 0) {
    alerts.push({
      type: "finance",
      severity: "critical",
      message: `${overdueCount} contas vencidas no financeiro`
    });
  }

  return alerts;
}

module.exports = {
  getAlerts
};
