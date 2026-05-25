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
     (dealership_id, title, brand, model, year, license_plate, version, color,
      fuel, transmission, mileage, price, fipe_price, status, is_featured, slug,
      seo_title, seo_description, purchase_price, acquisition_cost,
      acquisition_source, preparation_status, preparation_cost_estimate,
      preparation_cost_actual, notes, repair_notes, preparation_items,
      ad_quality_score, ad_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27::jsonb,$28,$29)
     RETURNING *`,
    [
      vehicle.dealership_id,
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
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
      vehicle.repair_notes,
      JSON.stringify(vehicle.preparation_items || []),
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
         license_plate = $5,
         version = $6,
         color = $7,
         fuel = $8,
         transmission = $9,
         mileage = $10,
         price = $11,
         fipe_price = $12,
         status = $13,
         is_featured = $14,
         slug = $15,
         seo_title = $16,
         seo_description = $17,
         purchase_price = $18,
         acquisition_cost = $19,
         acquisition_source = $20,
         preparation_status = $21,
         preparation_cost_estimate = $22,
         preparation_cost_actual = $23,
         notes = $24,
         repair_notes = $25,
         preparation_items = $26::jsonb,
         ad_quality_score = $27,
         ad_status = $28
     WHERE id = $29
       AND dealership_id = $30
     RETURNING *`,
    [
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
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
      vehicle.repair_notes,
      JSON.stringify(vehicle.preparation_items || []),
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
