const pool = require("../../config/db");

async function listOperationalRows(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       v.*,
       main_image.image_url AS main_photo_url,
       COALESCE(image_stats.image_count, 0)::int AS image_count,
       COALESCE(image_stats.has_main_image, false) AS has_main_image,
       aps.score AS ad_score,
       aps.grade AS ad_grade,
       aps.can_publish,
       aps.status AS readiness_status,
       COALESCE(aps.blocking_reasons, '[]'::jsonb) AS blocking_reasons,
       COALESCE(aps.warnings, '[]'::jsonb) AS warnings,
       latest_sale.id AS latest_sale_id,
       latest_sale.price AS latest_sale_price,
       latest_sale.approval_status AS latest_sale_status,
       latest_sale.created_at AS latest_sale_created_at,
       latest_sale.approved_at AS latest_sale_approved_at,
       latest_sale_user.name AS latest_sale_user_name,
       sold_user.name AS sold_by_user_name
     FROM vehicles v
     LEFT JOIN LATERAL (
       SELECT vi.image_url
       FROM vehicle_images vi
       WHERE vi.vehicle_id = v.id
         AND vi.dealership_id = v.dealership_id
       ORDER BY COALESCE(vi.is_main, false) DESC,
                COALESCE(vi.is_cover, false) DESC,
                vi.sort_order ASC NULLS LAST,
                vi.id ASC
       LIMIT 1
     ) main_image ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS image_count,
         BOOL_OR(COALESCE(vi.is_main, false) OR COALESCE(vi.is_cover, false)) AS has_main_image
       FROM vehicle_images vi
       WHERE vi.vehicle_id = v.id
         AND vi.dealership_id = v.dealership_id
     ) image_stats ON TRUE
     LEFT JOIN ad_preparation_scores aps
       ON aps.vehicle_id = v.id
      AND aps.dealership_id = v.dealership_id
     LEFT JOIN LATERAL (
       SELECT s.*
       FROM sales s
       WHERE s.vehicle_id = v.id
         AND s.dealership_id = v.dealership_id
         AND COALESCE(s.approval_status, 'approved') <> 'rejected'
       ORDER BY COALESCE(s.approved_at, s.created_at) DESC, s.id DESC
       LIMIT 1
     ) latest_sale ON TRUE
     LEFT JOIN users latest_sale_user ON latest_sale_user.id = latest_sale.user_id
     LEFT JOIN users sold_user ON sold_user.id = v.sold_by_user_id
     WHERE v.dealership_id = $1
     ORDER BY v.created_at DESC`,
    [dealershipId]
  );
  return rows;
}

module.exports = {
  listOperationalRows
};
