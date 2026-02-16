const pool = require("../../config/db");

async function getDealershipBySlug(slug) {
  const result = await pool.query(
    `SELECT * FROM dealerships WHERE slug = $1`,
    [slug]
  );

  return result.rows[0];
}

async function getVehiclesByDealership(slug) {
  const result = await pool.query(
    `
    SELECT v.*
    FROM vehicles v
    JOIN dealerships d ON d.id = v.dealership_id
    WHERE d.slug = $1
    AND v.status = 'available'
    ORDER BY v.created_at DESC
    `,
    [slug]
  );

  return result.rows;
}

async function getVehicleBySlug(dealershipSlug, vehicleSlug) {
  const result = await pool.query(
    `
    SELECT v.*
    FROM vehicles v
    JOIN dealerships d ON d.id = v.dealership_id
    WHERE d.slug = $1
    AND v.slug = $2
    `,
    [dealershipSlug, vehicleSlug]
  );

  return result.rows[0];
}

module.exports = {
  getDealershipBySlug,
  getVehiclesByDealership,
  getVehicleBySlug
};
