module.exports = {
  name: "013_vehicle_images_update",

  async up(client) {
    await client.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
    `);

    await client.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
    `);

    await client.query(`
      UPDATE vehicle_images
      SET is_main = is_cover
      WHERE is_cover = true
        AND (is_main IS DISTINCT FROM is_cover);
    `);
  },
};
