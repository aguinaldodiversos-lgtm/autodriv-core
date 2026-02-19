const pool = require("../../config/db");

/* =====================================================
   NOTIFICAR GERENTES SOBRE VENDA PENDENTE
===================================================== */

async function notifyManagersAboutPendingSale(dealershipId, saleId) {

  const managers = await pool.query(
    `SELECT id
     FROM users
     WHERE dealership_id = $1
     AND role IN ('admin', 'manager')`,
    [dealershipId]
  );

  for (const manager of managers.rows) {
    await pool.query(
      `INSERT INTO notifications
       (user_id, title, message, link)
       VALUES ($1,$2,$3,$4)`,
      [
        manager.id,
        "Nova venda aguardando aprovação",
        `A venda #${saleId} precisa da sua aprovação.`,
        `/sales-approval/${saleId}`
      ]
    );
  }
}

module.exports = {
  notifyManagersAboutPendingSale
};
