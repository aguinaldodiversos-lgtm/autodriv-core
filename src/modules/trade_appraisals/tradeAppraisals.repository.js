const pool = require("../../config/db");

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO trade_appraisals
      (dealership_id, lead_id, client_id, assigned_user_id, source, appraisal_type,
       status, customer_name, customer_phone, brand, model, version, year, mileage,
       color, fuel, transmission, license_plate, fipe_code, fipe_price,
       market_price_low, market_price_avg, market_price_high, expected_resale_price,
       condition_score, checklist, estimated_repair_cost, documentation_cost,
       desired_margin_percent, suggested_offer_price, min_offer_price, max_offer_price,
       pricing_breakdown, notes, metadata, evaluated_by, evaluated_at, updated_at)
     VALUES
      ($1,$2,$3,$4,COALESCE($5,'manual'),COALESCE($6,'trade_in'),COALESCE($7,'pending'),
       $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,
       COALESCE($27,0),COALESCE($28,0),COALESCE($29,12),$30,$31,$32,$33::jsonb,$34,$35::jsonb,$36,$37,NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id || null,
      data.client_id || null,
      data.assigned_user_id || null,
      data.source || "manual",
      data.appraisal_type || "trade_in",
      data.status || "pending",
      data.customer_name || null,
      data.customer_phone || null,
      data.brand,
      data.model,
      data.version || null,
      data.year || null,
      data.mileage || null,
      data.color || null,
      data.fuel || null,
      data.transmission || null,
      data.license_plate || null,
      data.fipe_code || null,
      data.fipe_price || null,
      data.market_price_low || null,
      data.market_price_avg || null,
      data.market_price_high || null,
      data.expected_resale_price || null,
      data.condition_score || null,
      JSON.stringify(data.checklist || {}),
      data.estimated_repair_cost || 0,
      data.documentation_cost || 0,
      data.desired_margin_percent ?? 12,
      data.suggested_offer_price || null,
      data.min_offer_price || null,
      data.max_offer_price || null,
      JSON.stringify(data.pricing_breakdown || {}),
      data.notes || null,
      JSON.stringify(data.metadata || {}),
      data.evaluated_by || null,
      data.evaluated_at || null
    ]
  );
  return rows[0];
}

async function list(dealershipId, filters = {}) {
  const params = [dealershipId];
  const where = ["ta.dealership_id = $1"];

  if (filters.status) {
    params.push(filters.status);
    where.push(`ta.status = $${params.length}`);
  }
  if (filters.lead_id) {
    params.push(filters.lead_id);
    where.push(`ta.lead_id = $${params.length}`);
  }

  const limit = Math.min(Math.max(parseInt(String(filters.limit), 10) || 50, 1), 200);
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT
       ta.*,
       COALESCE(l.name, l.client_name) AS lead_name,
       COALESCE(l.whatsapp_phone, l.phone, l.client_phone) AS lead_phone,
       u.name AS assigned_user_name,
       evaluator.name AS evaluated_by_name
     FROM trade_appraisals ta
     LEFT JOIN leads l ON l.id = ta.lead_id AND l.dealership_id = ta.dealership_id
     LEFT JOIN users u ON u.id = ta.assigned_user_id
     LEFT JOIN users evaluator ON evaluator.id = ta.evaluated_by
     WHERE ${where.join(" AND ")}
     ORDER BY ta.updated_at DESC, ta.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

async function findById(id, dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       ta.*,
       COALESCE(l.name, l.client_name) AS lead_name,
       COALESCE(l.whatsapp_phone, l.phone, l.client_phone) AS lead_phone,
       u.name AS assigned_user_name,
       evaluator.name AS evaluated_by_name
     FROM trade_appraisals ta
     LEFT JOIN leads l ON l.id = ta.lead_id AND l.dealership_id = ta.dealership_id
     LEFT JOIN users u ON u.id = ta.assigned_user_id
     LEFT JOIN users evaluator ON evaluator.id = ta.evaluated_by
     WHERE ta.id = $1 AND ta.dealership_id = $2`,
    [id, dealershipId]
  );
  return rows[0] || null;
}

async function update(id, dealershipId, data) {
  const { rows } = await pool.query(
    `UPDATE trade_appraisals
     SET status = COALESCE($1, status),
         assigned_user_id = COALESCE($2, assigned_user_id),
         condition_score = COALESCE($3, condition_score),
         checklist = COALESCE($4::jsonb, checklist),
         estimated_repair_cost = COALESCE($5, estimated_repair_cost),
         documentation_cost = COALESCE($6, documentation_cost),
         expected_resale_price = COALESCE($7, expected_resale_price),
         desired_margin_percent = COALESCE($8, desired_margin_percent),
         suggested_offer_price = COALESCE($9, suggested_offer_price),
         min_offer_price = COALESCE($10, min_offer_price),
         max_offer_price = COALESCE($11, max_offer_price),
         final_offer_price = COALESCE($12, final_offer_price),
         offer_expires_at = COALESCE($13, offer_expires_at),
         pricing_breakdown = COALESCE($14::jsonb, pricing_breakdown),
         notes = COALESCE($15, notes),
         metadata = metadata || COALESCE($16::jsonb, '{}'::jsonb),
         evaluated_by = COALESCE($17, evaluated_by),
         evaluated_at = COALESCE($18, evaluated_at),
         updated_at = NOW()
     WHERE id = $19 AND dealership_id = $20
     RETURNING *`,
    [
      data.status || null,
      data.assigned_user_id || null,
      data.condition_score || null,
      data.checklist ? JSON.stringify(data.checklist) : null,
      data.estimated_repair_cost ?? null,
      data.documentation_cost ?? null,
      data.expected_resale_price ?? null,
      data.desired_margin_percent ?? null,
      data.suggested_offer_price ?? null,
      data.min_offer_price ?? null,
      data.max_offer_price ?? null,
      data.final_offer_price ?? null,
      data.offer_expires_at || null,
      data.pricing_breakdown ? JSON.stringify(data.pricing_breakdown) : null,
      data.notes || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.evaluated_by || null,
      data.evaluated_at || null,
      id,
      dealershipId
    ]
  );
  return rows[0] || null;
}

async function createSellerAction(data) {
  const { rows } = await pool.query(
    `INSERT INTO seller_actions
      (dealership_id, lead_id, assigned_seller_id, type, priority, title, description,
       due_at, status, source, metadata, updated_at)
     VALUES ($1,$2,$3,'trade_in_evaluation',$4,$5,$6,COALESCE($7::timestamptz, NOW()),'pending','trade_appraisal',$8::jsonb,NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id || null,
      data.assigned_seller_id || null,
      data.priority || "high",
      data.title,
      data.description || null,
      data.due_at || null,
      JSON.stringify(data.metadata || {})
    ]
  );
  return rows[0];
}

async function convertToVehicle(appraisal, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const vehicleResult = await client.query(
      `INSERT INTO vehicles
        (dealership_id, title, brand, model, year, version, color, fuel,
         transmission, mileage, price, fipe_price, license_plate, purchase_price,
         acquisition_source, preparation_cost_estimate, documentation_cost,
         preparation_status, appraisal_status, notes, status, ad_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL,$11,$12,$13,'trade_in',
               $14,$15,'not_started','done',$16,'available','draft')
       RETURNING *`,
      [
        appraisal.dealership_id,
        [appraisal.brand, appraisal.model, appraisal.version, appraisal.year].filter(Boolean).join(" "),
        appraisal.brand,
        appraisal.model,
        appraisal.year,
        appraisal.version,
        appraisal.color,
        appraisal.fuel,
        appraisal.transmission,
        appraisal.mileage,
        appraisal.fipe_price,
        appraisal.license_plate,
        appraisal.final_offer_price || appraisal.suggested_offer_price,
        appraisal.estimated_repair_cost || 0,
        appraisal.documentation_cost || 0,
        `Convertido da avaliacao de troca #${appraisal.id}`
      ]
    );
    const vehicle = vehicleResult.rows[0];
    const updateResult = await client.query(
      `UPDATE trade_appraisals
       SET status = 'converted',
           converted_vehicle_id = $1,
           evaluated_by = COALESCE(evaluated_by, $2),
           evaluated_at = COALESCE(evaluated_at, NOW()),
           updated_at = NOW()
       WHERE id = $3 AND dealership_id = $4
       RETURNING *`,
      [vehicle.id, userId || null, appraisal.id, appraisal.dealership_id]
    );
    await client.query("COMMIT");
    return {
      appraisal: updateResult.rows[0],
      vehicle
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  create,
  list,
  findById,
  update,
  createSellerAction,
  convertToVehicle
};
