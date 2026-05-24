const pool = require("../../config/db");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function opportunity(input) {
  return {
    opportunity_key: input.key,
    client_id: input.client_id || null,
    lead_id: input.lead_id || null,
    vehicle_id: input.vehicle_id || null,
    sale_id: input.sale_id || null,
    type: input.type,
    reason: input.reason,
    suggested_action: input.suggested_action,
    due_at: input.due_at || null,
    assigned_user_id: input.assigned_user_id || null,
    metadata: input.metadata || {}
  };
}

async function collectBirthdayOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, birth_date
     FROM clients
     WHERE dealership_id = $1
       AND birth_date IS NOT NULL
       AND (
         TO_DATE(TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(birth_date, 'MM-DD'), 'YYYY-MM-DD')
         BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
       )
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((client) =>
    opportunity({
      key: `client:${client.id}:birthday:${new Date().getFullYear()}`,
      client_id: client.id,
      type: "client_birthday",
      reason: `Aniversario de ${client.name} nos proximos 14 dias`,
      suggested_action: "Enviar mensagem personalizada e abrir oportunidade de relacionamento",
      due_at: client.birth_date,
      metadata: { client_name: client.name, phone: client.phone, email: client.email }
    })
  );
}

async function collectPurchaseAnniversaryOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       s.id AS sale_id,
       s.client_id,
       s.vehicle_id,
       s.created_at,
       c.name AS client_name,
       v.title AS vehicle_title
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     LEFT JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.dealership_id = $1
       AND s.created_at < NOW() - INTERVAL '90 days'
       AND TO_CHAR(s.created_at, 'MM-DD')
           BETWEEN TO_CHAR(NOW(), 'MM-DD')
               AND TO_CHAR(NOW() + INTERVAL '30 days', 'MM-DD')
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((sale) =>
    opportunity({
      key: `sale:${sale.sale_id}:purchase-anniversary:${new Date().getFullYear()}`,
      client_id: sale.client_id,
      vehicle_id: sale.vehicle_id,
      sale_id: sale.sale_id,
      type: "purchase_anniversary",
      reason: `Compra de ${sale.vehicle_title || "veiculo"} perto de completar aniversario`,
      suggested_action: "Reativar cliente com avaliacao de troca ou oferta de recompra",
      due_at: sale.created_at,
      metadata: {
        client_name: sale.client_name,
        vehicle_title: sale.vehicle_title
      }
    })
  );
}

async function collectFinancingOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT id, description, due_date, amount
     FROM finance_entries
     WHERE dealership_id = $1
       AND status = 'pending'
       AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
       AND (
         category ILIKE '%financ%'
         OR description ILIKE '%financ%'
       )
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((entry) =>
    opportunity({
      key: `finance:${entry.id}:financing-ending`,
      type: "financing_ending",
      reason: `Parcela/contrato financeiro proximo do vencimento: ${entry.description || entry.id}`,
      suggested_action: "Contatar cliente para recompra, troca ou renovacao de financiamento",
      due_at: entry.due_date,
      metadata: { finance_entry_id: entry.id, amount: entry.amount }
    })
  );
}

async function collectStaleProposalOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.lead_id,
       p.client_id,
       p.vehicle_id,
       p.status,
       p.created_at,
       COALESCE(l.assigned_user_id, NULL) AS assigned_user_id,
       COALESCE(l.name, l.client_name, c.name) AS client_name,
       v.title AS vehicle_title
     FROM proposals p
     LEFT JOIN leads l ON l.id = p.lead_id
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN vehicles v ON v.id = p.vehicle_id
     WHERE p.dealership_id = $1
       AND COALESCE(p.status, 'pending') IN ('pending', 'open', 'sent')
       AND p.updated_at < NOW() - INTERVAL '72 hours'
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((proposal) =>
    opportunity({
      key: `proposal:${proposal.id}:stale`,
      client_id: proposal.client_id,
      lead_id: proposal.lead_id,
      vehicle_id: proposal.vehicle_id,
      type: "stale_proposal",
      reason: `Proposta sem resposta ha mais de 72 horas`,
      suggested_action: "Retomar contato com argumento de escassez, condicao ou alternativa de veiculo",
      assigned_user_id: proposal.assigned_user_id,
      metadata: {
        proposal_id: proposal.id,
        client_name: proposal.client_name,
        vehicle_title: proposal.vehicle_title
      }
    })
  );
}

async function collectStaleLeadOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       l.id,
       l.vehicle_id,
       l.assigned_user_id,
       COALESCE(l.name, l.client_name) AS name,
       COALESCE(l.phone, l.client_phone) AS phone,
       l.updated_at,
       ps.key AS stage_key
     FROM leads l
     LEFT JOIN pipeline_stages ps ON ps.id = l.pipeline_stage_id
     WHERE l.dealership_id = $1
       AND l.closed_at IS NULL
       AND COALESCE(l.status, 'new') NOT IN ('won', 'lost')
       AND l.updated_at < NOW() - INTERVAL '7 days'
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((lead) =>
    opportunity({
      key: `lead:${lead.id}:stale-reactivation`,
      lead_id: lead.id,
      vehicle_id: lead.vehicle_id,
      type: "stale_lead",
      reason: `Lead parado ha mais de 7 dias`,
      suggested_action: "Reativar com mensagem curta, oferta alternativa ou chamada para visita",
      assigned_user_id: lead.assigned_user_id,
      metadata: {
        lead_name: lead.name,
        phone: lead.phone,
        stage_key: lead.stage_key
      }
    })
  );
}

async function collectReviewOpportunities(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       s.id AS sale_id,
       s.client_id,
       s.vehicle_id,
       s.created_at,
       c.name AS client_name,
       v.title AS vehicle_title
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     LEFT JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.dealership_id = $1
       AND s.created_at + INTERVAL '6 months'
           BETWEEN NOW() AND NOW() + INTERVAL '30 days'
     LIMIT 50`,
    [dealershipId]
  );
  return rows.map((sale) =>
    opportunity({
      key: `sale:${sale.sale_id}:six-month-review`,
      client_id: sale.client_id,
      vehicle_id: sale.vehicle_id,
      sale_id: sale.sale_id,
      type: "review_reminder",
      reason: `Cliente chegando a 6 meses de compra`,
      suggested_action: "Oferecer revisao, check-up e avaliacao de troca futura",
      due_at: sale.created_at,
      metadata: {
        client_name: sale.client_name,
        vehicle_title: sale.vehicle_title
      }
    })
  );
}

async function upsertOpportunities(dealershipId, opportunities) {
  const saved = [];
  for (const item of opportunities) {
    const { rows } = await pool.query(
      `INSERT INTO post_sale_opportunities
       (dealership_id, opportunity_key, client_id, lead_id, vehicle_id, sale_id,
        type, reason, suggested_action, due_at, assigned_user_id, metadata, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())
       ON CONFLICT (dealership_id, opportunity_key)
       DO UPDATE SET
         reason = EXCLUDED.reason,
         suggested_action = EXCLUDED.suggested_action,
         due_at = EXCLUDED.due_at,
         assigned_user_id = COALESCE(post_sale_opportunities.assigned_user_id, EXCLUDED.assigned_user_id),
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       WHERE post_sale_opportunities.status = 'pending'
       RETURNING *`,
      [
        dealershipId,
        item.opportunity_key,
        item.client_id,
        item.lead_id,
        item.vehicle_id,
        item.sale_id,
        item.type,
        item.reason,
        item.suggested_action,
        item.due_at,
        item.assigned_user_id,
        JSON.stringify(item.metadata || {})
      ]
    );
    if (rows[0]) saved.push(rows[0]);
  }
  return saved;
}

async function generateOpportunities(user) {
  const did = dealershipId(user);
  const opportunities = [
    ...(await collectBirthdayOpportunities(did)),
    ...(await collectPurchaseAnniversaryOpportunities(did)),
    ...(await collectFinancingOpportunities(did)),
    ...(await collectStaleProposalOpportunities(did)),
    ...(await collectStaleLeadOpportunities(did)),
    ...(await collectReviewOpportunities(did))
  ];
  const saved = await upsertOpportunities(did, opportunities);
  return {
    generated_at: new Date().toISOString(),
    generated: opportunities.length,
    saved: saved.length,
    opportunities: saved
  };
}

async function listOpportunities(user, filters = {}) {
  const did = dealershipId(user);
  const params = [did];
  const where = ["p.dealership_id = $1"];
  if (filters.status) {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  } else {
    where.push("p.status = 'pending'");
  }
  if (filters.type) {
    params.push(filters.type);
    where.push(`p.type = $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT
       p.*,
       c.name AS client_name,
       COALESCE(l.name, l.client_name) AS lead_name,
       v.title AS vehicle_title,
       u.name AS assigned_user_name
     FROM post_sale_opportunities p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN leads l ON l.id = p.lead_id
     LEFT JOIN vehicles v ON v.id = p.vehicle_id
     LEFT JOIN users u ON u.id = p.assigned_user_id
     WHERE ${where.join(" AND ")}
     ORDER BY p.due_at ASC NULLS LAST, p.updated_at DESC
     LIMIT 200`,
    params
  );
  return rows;
}

async function updateOpportunity(user, id, status) {
  const did = dealershipId(user);
  if (!["pending", "done", "dismissed"].includes(status)) {
    throw httpError("status invalido", 400);
  }
  const { rows } = await pool.query(
    `UPDATE post_sale_opportunities
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND dealership_id = $3
     RETURNING *`,
    [status, id, did]
  );
  if (!rows[0]) throw httpError("Oportunidade nao encontrada", 404);
  return rows[0];
}

module.exports = {
  generateOpportunities,
  listOpportunities,
  updateOpportunity
};
