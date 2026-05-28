module.exports = {
  name: "049_ad_preparation_module",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS ad_description TEXT,
      ADD COLUMN IF NOT EXISTS ad_preparation_status TEXT DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS documentation_checked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS documentation_notes TEXT,
      ADD COLUMN IF NOT EXISTS legal_restriction_status TEXT DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS documentation_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS transport_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS commission_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS other_costs NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS price_strategy TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_preparation_checks (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        check_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'missing'
          CHECK (status IN ('missing', 'pending', 'valid', 'warning', 'blocked', 'manually_approved')),
        severity TEXT NOT NULL DEFAULT 'warning'
          CHECK (severity IN ('info', 'warning', 'blocking', 'critical')),
        required BOOLEAN NOT NULL DEFAULT TRUE,
        weight INT NOT NULL DEFAULT 0,
        current_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        expected_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        message TEXT,
        action_hint TEXT,
        manually_approved_by INT REFERENCES users(id) ON DELETE SET NULL,
        manually_approved_at TIMESTAMPTZ,
        manual_approval_reason TEXT,
        last_checked_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (vehicle_id, check_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_preparation_checks_vehicle
      ON ad_preparation_checks (dealership_id, vehicle_id, category);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_preparation_scores (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        score INT NOT NULL DEFAULT 0,
        grade TEXT NOT NULL DEFAULT 'blocked',
        can_publish BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'blocked',
        blocking_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
        warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
        breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        computed_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (vehicle_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_preparation_scores_status
      ON ad_preparation_scores (dealership_id, status, score DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_commercial_suggestions (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        suggestion_type TEXT NOT NULL
          CHECK (suggestion_type IN ('description', 'price', 'priority')),
        provider TEXT NOT NULL DEFAULT 'rule_based'
          CHECK (provider IN ('rule_based', 'ai', 'mock', 'manual')),
        status TEXT NOT NULL DEFAULT 'suggested'
          CHECK (status IN ('suggested', 'accepted', 'rejected', 'expired')),
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        accepted_by INT REFERENCES users(id) ON DELETE SET NULL,
        accepted_at TIMESTAMPTZ,
        rejected_by INT REFERENCES users(id) ON DELETE SET NULL,
        rejected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_commercial_suggestions_active
      ON vehicle_commercial_suggestions (dealership_id, vehicle_id, suggestion_type, status, created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS publication_overrides (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        override_type TEXT NOT NULL DEFAULT 'ad_preparation',
        reason TEXT NOT NULL,
        approved_by INT REFERENCES users(id) ON DELETE SET NULL,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_publication_overrides_vehicle
      ON publication_overrides (dealership_id, vehicle_id, expires_at DESC);
    `);
  }
};
