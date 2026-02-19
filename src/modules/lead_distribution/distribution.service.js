const pool = require("../../config/db");

/* =====================================================
   DISTRIBUIÇÃO INTELIGENTE
===================================================== */
async function distributeLead(leadId) {
  const leadResult = await pool.query(
    `SELECT dealership_id FROM leads WHERE id = $1`,
    [leadId]
  );

  if (!leadResult.rows.length) return;

  const dealershipId = leadResult.rows[0].dealership_id;

  // Busca vendedores ativos
  const usersResult = await pool.query(
    `SELECT u.id,
            COUNT(l.id) as total_leads
     FROM users u
     LEFT JOIN leads l
       ON l.assigned_user_id = u.id
     WHERE u.dealership_id = $1
     AND u.role = 'seller'
     GROUP BY u.id
     ORDER BY total_leads ASC`,
    [dealershipId]
  );

  if (!usersResult.rows.length) return;

  // Escolhe vendedor com menos leads
  const selectedUser = usersResult.rows[0];

  await pool.query(
    `UPDATE leads
     SET assigned_user_id = $2
     WHERE id = $1`,
    [leadId, selectedUser.id]
  );

  return selectedUser.id;
}

/* =====================================================
   LISTA COMPLETA PARA ADMIN
===================================================== */
async function getAdminLeadList(dealershipId) {
  const result = await pool.query(
    `SELECT
        l.id,
        l.name,
        l.phone,
        l.status,
        l.score,
        l.priority_score,
        l.assigned_user_id,
        u.name as seller_name,
        s.stage,
        s.payment_type,
        s.has_trade_in,
        s.visit_scheduled_at,
        (
          SELECT MAX(created_at)
          FROM lead_conversations
          WHERE lead_id = l.id
        ) as last_interaction
     FROM leads l
     LEFT JOIN users u
       ON u.id = l.assigned_user_id
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
     WHERE l.dealership_id = $1
     ORDER BY l.priority_score DESC NULLS LAST`,
    [dealershipId]
  );

  return result.rows;
}

module.exports = {
  distributeLead,
  getAdminLeadList
};
