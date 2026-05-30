module.exports = {
  name: "053_proposal_contract_flow",

  async up(pool) {
    await pool.query(`
      ALTER TABLE proposals
      ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS accepted_by INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS contract_id INT REFERENCES contracts(id) ON DELETE SET NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proposals_dealership_status_updated
      ON proposals(dealership_id, status, updated_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proposals_dealership_vehicle_status
      ON proposals(dealership_id, vehicle_id, status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proposals_sale_contract
      ON proposals(dealership_id, sale_id, contract_id);
    `);
  }
};
