const pool = require("../../config/db");

const vehicleSelect = `
  SELECT
    v.*,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', vi.id,
            'image_url', vi.image_url,
            'is_main', vi.is_main,
            'is_cover', vi.is_cover,
            'sort_order', vi.sort_order,
            'label', vi.label,
            'notes', vi.notes
          )
          ORDER BY vi.is_main DESC NULLS LAST, vi.sort_order ASC NULLS LAST, vi.id ASC
        )
        FROM vehicle_images vi
        WHERE vi.vehicle_id = v.id
      ),
      '[]'::json
    ) AS images
  FROM vehicles v
`;

async function create(vehicle) {
  const result = await pool.query(
    `INSERT INTO vehicles
     (dealership_id, title, brand, model, year, fipe_brand_code,
      fipe_model_code, fipe_year_code, fipe_code, fipe_reference_month,
      license_plate, version, color, fuel, transmission, mileage, price,
      fipe_price, status, is_featured, slug, seo_title, seo_description,
      purchase_price, acquisition_cost, acquisition_source, preparation_status,
      preparation_cost_estimate, preparation_cost_actual, notes, ad_description,
      repair_notes, preparation_items, documentation_status, documentation_notes,
      legal_restriction_status, documentation_cost, transport_cost, commission_cost,
      other_costs, price_strategy, ad_quality_score, ad_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33::jsonb,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43)
     RETURNING *`,
    [
      vehicle.dealership_id,
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.fipe_brand_code,
      vehicle.fipe_model_code,
      vehicle.fipe_year_code,
      vehicle.fipe_code,
      vehicle.fipe_reference_month,
      vehicle.license_plate,
      vehicle.version,
      vehicle.color,
      vehicle.fuel,
      vehicle.transmission,
      vehicle.mileage,
      vehicle.price,
      vehicle.fipe_price,
      vehicle.status,
      vehicle.is_featured,
      vehicle.slug,
      vehicle.seo_title,
      vehicle.seo_description,
      vehicle.purchase_price,
      vehicle.acquisition_cost,
      vehicle.acquisition_source,
      vehicle.preparation_status,
      vehicle.preparation_cost_estimate,
      vehicle.preparation_cost_actual,
      vehicle.notes,
      vehicle.ad_description,
      vehicle.repair_notes,
      JSON.stringify(vehicle.preparation_items || []),
      vehicle.documentation_status,
      vehicle.documentation_notes,
      vehicle.legal_restriction_status,
      vehicle.documentation_cost,
      vehicle.transport_cost,
      vehicle.commission_cost,
      vehicle.other_costs,
      vehicle.price_strategy,
      vehicle.ad_quality_score,
      vehicle.ad_status
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `${vehicleSelect}
     WHERE v.dealership_id = $1
     ORDER BY v.created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function findById(id, dealershipId) {
  const result = await pool.query(
    `${vehicleSelect}
     WHERE v.id = $1
       AND v.dealership_id = $2`,
    [id, dealershipId]
  );

  return result.rows[0];
}

async function update(id, dealershipId, vehicle) {
  const result = await pool.query(
    `UPDATE vehicles
     SET title = $1,
         brand = $2,
         model = $3,
         year = $4,
         fipe_brand_code = $5,
         fipe_model_code = $6,
         fipe_year_code = $7,
         fipe_code = $8,
         fipe_reference_month = $9,
         license_plate = $10,
         version = $11,
         color = $12,
         fuel = $13,
         transmission = $14,
         mileage = $15,
         price = $16,
         fipe_price = $17,
         status = $18,
         is_featured = $19,
         slug = $20,
         seo_title = $21,
         seo_description = $22,
         purchase_price = $23,
         acquisition_cost = $24,
         acquisition_source = $25,
         preparation_status = $26,
         preparation_cost_estimate = $27,
         preparation_cost_actual = $28,
         notes = $29,
         ad_description = $30,
         repair_notes = $31,
         preparation_items = $32::jsonb,
         documentation_status = $33,
         documentation_notes = $34,
         legal_restriction_status = $35,
         documentation_cost = $36,
         transport_cost = $37,
         commission_cost = $38,
         other_costs = $39,
         price_strategy = $40,
         ad_quality_score = $41,
         ad_status = $42
     WHERE id = $43
       AND dealership_id = $44
     RETURNING *`,
    [
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.fipe_brand_code,
      vehicle.fipe_model_code,
      vehicle.fipe_year_code,
      vehicle.fipe_code,
      vehicle.fipe_reference_month,
      vehicle.license_plate,
      vehicle.version,
      vehicle.color,
      vehicle.fuel,
      vehicle.transmission,
      vehicle.mileage,
      vehicle.price,
      vehicle.fipe_price,
      vehicle.status,
      vehicle.is_featured,
      vehicle.slug,
      vehicle.seo_title,
      vehicle.seo_description,
      vehicle.purchase_price,
      vehicle.acquisition_cost,
      vehicle.acquisition_source,
      vehicle.preparation_status,
      vehicle.preparation_cost_estimate,
      vehicle.preparation_cost_actual,
      vehicle.notes,
      vehicle.ad_description,
      vehicle.repair_notes,
      JSON.stringify(vehicle.preparation_items || []),
      vehicle.documentation_status,
      vehicle.documentation_notes,
      vehicle.legal_restriction_status,
      vehicle.documentation_cost,
      vehicle.transport_cost,
      vehicle.commission_cost,
      vehicle.other_costs,
      vehicle.price_strategy,
      vehicle.ad_quality_score,
      vehicle.ad_status,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

async function addImageUrls(vehicleId, dealershipId, imageUrls) {
  const cleanUrls = Array.from(
    new Set(
      imageUrls
        .map((url) => String(url || "").trim())
        .filter((url) => /^https?:\/\//i.test(url))
    )
  );

  for (let index = 0; index < cleanUrls.length; index += 1) {
    await pool.query(
      `INSERT INTO vehicle_images
       (dealership_id, vehicle_id, image_url, is_main, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (vehicle_id, image_url)
       DO UPDATE SET
         dealership_id = EXCLUDED.dealership_id,
         sort_order = LEAST(COALESCE(vehicle_images.sort_order, EXCLUDED.sort_order), EXCLUDED.sort_order)
       RETURNING *`,
      [dealershipId, vehicleId, cleanUrls[index], index === 0, index]
    );
  }
}

async function remove(id, dealershipId) {
  const result = await pool.query(
    `DELETE FROM vehicles
     WHERE id = $1
       AND dealership_id = $2
     RETURNING id`,
    [id, dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  addImageUrls,
  remove
};
