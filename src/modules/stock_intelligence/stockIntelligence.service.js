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

function calculateVehicleSignals(vehicle) {
  const price = Number(vehicle.price || 0);
  const fipe = Number(vehicle.fipe_price || 0);
  const purchase = Number(vehicle.purchase_price || 0);
  const acquisitionCost = Number(vehicle.acquisition_cost || 0);
  const prepActual = Number(vehicle.preparation_cost_actual || 0);
  const prepEstimate = Number(vehicle.preparation_cost_estimate || 0);
  const totalCost = purchase + acquisitionCost + prepActual;
  const projectedCost = purchase + acquisitionCost + Math.max(prepActual, prepEstimate);
  const margin = price && totalCost ? price - totalCost : null;
  const projectedMargin = price && projectedCost ? price - projectedCost : null;
  const marginPercent = margin != null && price > 0 ? (margin / price) * 100 : null;
  const fipeDiffPercent = price && fipe ? ((price - fipe) / fipe) * 100 : null;
  const daysInStock = Number(vehicle.days_in_stock || 0);
  const adQuality = Number(vehicle.ad_quality_score || 0);

  const suggestions = [];
  if (daysInStock >= 60) {
    suggestions.push({
      type: "aging_stock",
      priority: Math.min(100, 55 + Math.floor(daysInStock / 3)),
      action: "Revisar preco, fotos e impulsionar o anuncio",
      reason: `Veiculo parado ha ${daysInStock} dias`
    });
  }
  if (fipeDiffPercent != null && fipeDiffPercent >= 8) {
    suggestions.push({
      type: "price_above_fipe",
      priority: Math.min(100, 60 + Math.round(fipeDiffPercent * 2)),
      action: "Avaliar reducao de preco ou justificar diferenciais no anuncio",
      reason: `Preco ${Math.round(fipeDiffPercent)}% acima da FIPE`
    });
  }
  if (adQuality > 0 && adQuality < 60) {
    suggestions.push({
      type: "bad_ad_quality",
      priority: 70,
      action: "Melhorar fotos, descricao e dados do anuncio",
      reason: `Qualidade do anuncio em ${adQuality}/100`
    });
  }
  if (projectedMargin != null && projectedMargin < 0) {
    suggestions.push({
      type: "negative_margin",
      priority: 90,
      action: "Bloquear desconto e revisar custo/preco antes de negociar",
      reason: "Margem projetada negativa"
    });
  }
  if (vehicle.preparation_status !== "done" && daysInStock >= 7) {
    suggestions.push({
      type: "preparation_delay",
      priority: 65,
      action: "Concluir preparacao para liberar venda e fotos finais",
      reason: "Preparacao pendente atrasa giro do estoque"
    });
  }

  return {
    total_cost: totalCost || null,
    projected_cost: projectedCost || null,
    margin,
    projected_margin: projectedMargin,
    margin_percent: marginPercent == null ? null : Number(marginPercent.toFixed(1)),
    fipe_difference_percent: fipeDiffPercent == null ? null : Number(fipeDiffPercent.toFixed(1)),
    days_in_stock: daysInStock,
    suggestions: suggestions.sort((a, b) => b.priority - a.priority)
  };
}

async function listStock(user) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `SELECT
       v.*,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(v.entry_date, v.created_at))) / 86400)::int AS days_in_stock,
       COUNT(vi.id)::int AS image_count,
       COUNT(vpt.id) FILTER (WHERE vpt.status <> 'done')::int AS pending_preparation_tasks
     FROM vehicles v
     LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id
     LEFT JOIN vehicle_preparation_tasks vpt ON vpt.vehicle_id = v.id
     WHERE v.dealership_id = $1
       AND v.status <> 'sold'
     GROUP BY v.id
     ORDER BY COALESCE(v.entry_date, v.created_at) ASC`,
    [did]
  );

  return rows.map((vehicle) => ({
    ...vehicle,
    intelligence: calculateVehicleSignals(vehicle)
  }));
}

async function getVehicleIntelligence(user, vehicleId) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `SELECT
       v.*,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(v.entry_date, v.created_at))) / 86400)::int AS days_in_stock
     FROM vehicles v
     WHERE v.id = $1 AND v.dealership_id = $2`,
    [vehicleId, did]
  );
  if (!rows[0]) throw httpError("Veiculo nao encontrado", 404);

  const prep = await pool.query(
    `SELECT * FROM vehicle_preparation_tasks
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY status ASC, due_at ASC NULLS LAST, created_at DESC`,
    [vehicleId, did]
  );
  const appraisals = await pool.query(
    `SELECT va.*, u.name AS appraised_by_name
     FROM vehicle_appraisals va
     LEFT JOIN users u ON u.id = va.appraised_by
     WHERE va.vehicle_id = $1 AND va.dealership_id = $2
     ORDER BY va.created_at DESC
     LIMIT 10`,
    [vehicleId, did]
  );

  return {
    vehicle: rows[0],
    intelligence: calculateVehicleSignals(rows[0]),
    preparation_tasks: prep.rows,
    appraisals: appraisals.rows
  };
}

async function updateStockProfile(user, vehicleId, data) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `UPDATE vehicles
     SET purchase_price = COALESCE($1, purchase_price),
         acquisition_cost = COALESCE($2, acquisition_cost),
         acquisition_source = COALESCE($3, acquisition_source),
         appraisal_status = COALESCE($4, appraisal_status),
         preparation_status = COALESCE($5, preparation_status),
         preparation_cost_estimate = COALESCE($6, preparation_cost_estimate),
         preparation_cost_actual = COALESCE($7, preparation_cost_actual),
         market_price_low = COALESCE($8, market_price_low),
         market_price_avg = COALESCE($9, market_price_avg),
         market_price_high = COALESCE($10, market_price_high),
         last_market_check_at = CASE
           WHEN $8::numeric IS NOT NULL OR $9::numeric IS NOT NULL OR $10::numeric IS NOT NULL THEN NOW()
           ELSE last_market_check_at
         END,
         ad_quality_score = COALESCE($11, ad_quality_score),
         ad_status = COALESCE($12, ad_status)
     WHERE id = $13 AND dealership_id = $14
     RETURNING *`,
    [
      data.purchase_price ?? null,
      data.acquisition_cost ?? null,
      data.acquisition_source ?? null,
      data.appraisal_status ?? null,
      data.preparation_status ?? null,
      data.preparation_cost_estimate ?? null,
      data.preparation_cost_actual ?? null,
      data.market_price_low ?? null,
      data.market_price_avg ?? null,
      data.market_price_high ?? null,
      data.ad_quality_score ?? null,
      data.ad_status ?? null,
      vehicleId,
      did
    ]
  );
  if (!rows[0]) throw httpError("Veiculo nao encontrado", 404);
  return {
    vehicle: rows[0],
    intelligence: calculateVehicleSignals(rows[0])
  };
}

async function createAppraisal(user, vehicleId, data) {
  const did = dealershipId(user);
  const vehicleCheck = await pool.query(
    `SELECT id FROM vehicles WHERE id = $1 AND dealership_id = $2`,
    [vehicleId, did]
  );
  if (!vehicleCheck.rows.length) throw httpError("Veiculo nao encontrado", 404);

  const { rows } = await pool.query(
    `INSERT INTO vehicle_appraisals
      (dealership_id, vehicle_id, appraised_by, condition_score, checklist,
       estimated_repair_cost, suggested_purchase_price, notes)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
     RETURNING *`,
    [
      did,
      vehicleId,
      user.id || null,
      data.condition_score ?? null,
      JSON.stringify(data.checklist || {}),
      data.estimated_repair_cost ?? 0,
      data.suggested_purchase_price ?? null,
      data.notes || null
    ]
  );

  await pool.query(
    `UPDATE vehicles
     SET appraisal_status = 'done',
         appraised_at = NOW(),
         preparation_cost_estimate = COALESCE($1, preparation_cost_estimate)
     WHERE id = $2 AND dealership_id = $3`,
    [data.estimated_repair_cost ?? null, vehicleId, did]
  );

  return rows[0];
}

async function upsertPreparationTask(user, vehicleId, data) {
  const did = dealershipId(user);
  if (!data.title && !data.id) throw httpError("title e obrigatorio", 400);

  if (data.id) {
    const { rows } = await pool.query(
      `UPDATE vehicle_preparation_tasks
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           estimated_cost = COALESCE($3, estimated_cost),
           actual_cost = COALESCE($4, actual_cost),
           supplier = COALESCE($5, supplier),
           due_at = COALESCE($6, due_at),
           completed_at = CASE WHEN $2 = 'done' THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $7 AND vehicle_id = $8 AND dealership_id = $9
       RETURNING *`,
      [
        data.title ?? null,
        data.status ?? null,
        data.estimated_cost ?? null,
        data.actual_cost ?? null,
        data.supplier ?? null,
        data.due_at ?? null,
        data.id,
        vehicleId,
        did
      ]
    );
    if (!rows[0]) throw httpError("Tarefa de preparacao nao encontrada", 404);
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO vehicle_preparation_tasks
      (dealership_id, vehicle_id, title, status, estimated_cost, actual_cost, supplier, due_at)
     VALUES ($1,$2,$3,COALESCE($4,'pending'),COALESCE($5,0),COALESCE($6,0),$7,$8)
     RETURNING *`,
    [
      did,
      vehicleId,
      data.title,
      data.status || "pending",
      data.estimated_cost ?? 0,
      data.actual_cost ?? 0,
      data.supplier || null,
      data.due_at || null
    ]
  );
  return rows[0];
}

module.exports = {
  listStock,
  getVehicleIntelligence,
  updateStockProfile,
  createAppraisal,
  upsertPreparationTask,
  calculateVehicleSignals
};
