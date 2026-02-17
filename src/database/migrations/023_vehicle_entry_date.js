module.exports = {
  name: "023_vehicle_entry_date",

  async up(pool) {
    // adiciona coluna de entrada no estoque se não existir
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP;
    `);

    // preenche com created_at caso esteja nulo
    await pool.query(`
      UPDATE vehicles
      SET entry_date = created_at
      WHERE entry_date IS NULL;
    `);
  }
};
