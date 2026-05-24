const pool = require("../../config/db");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/* =====================================================
   DISTRIBUIÇÃO INTELIGENTE
   Obrigatório: userDealershipId = req.user.dealership_id (nunca confiar só no id do lead).
===================================================== */
async function distributeLead(leadId, userDealershipId) {
  if (userDealershipId == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }

  const id = parseInt(leadId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError("leadId inválido", 400);
  }

  const userDealer = Number(userDealershipId);
  if (!Number.isFinite(userDealer)) {
    throw httpError("Loja inválida", 400);
  }

  const leadResult = await pool.query(
    `SELECT id, dealership_id FROM leads WHERE id = $1`,
    [id]
  );

  if (!leadResult.rows.length) {
    throw httpError("Lead não encontrado", 404);
  }

  const leadDealer = Number(leadResult.rows[0].dealership_id);
  if (leadDealer !== userDealer) {
    throw httpError("Acesso negado: lead de outra loja", 403);
  }

  // Busca vendedores ativos (sempre na mesma loja do token)
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
    [userDealer]
  );

  if (!usersResult.rows.length) return;

  const selectedUser = usersResult.rows[0];

  const update = await pool.query(
    `UPDATE leads
     SET assigned_user_id = $2
     WHERE id = $1
       AND dealership_id = $3
     RETURNING id`,
    [id, selectedUser.id, userDealer]
  );

  if (!update.rows.length) {
    throw httpError("Lead não encontrado", 404);
  }

  return selectedUser.id;
}

/* =====================================================
   LISTA COMPLETA PARA ADMIN
===================================================== */
async function getAdminLeadList(dealershipId) {
  if (dealershipId == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }

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
