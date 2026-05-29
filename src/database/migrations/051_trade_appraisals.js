module.exports = {
  name: "051_trade_appraisals",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trade_appraisals (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        evaluated_by INT REFERENCES users(id) ON DELETE SET NULL,
        converted_vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        appraisal_type TEXT NOT NULL DEFAULT 'trade_in'
          CHECK (appraisal_type IN ('trade_in', 'direct_purchase')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_review', 'offered', 'accepted', 'rejected', 'converted', 'archived')),
        customer_name TEXT,
        customer_phone TEXT,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        version TEXT,
        year INT,
        mileage INT,
        color TEXT,
        fuel TEXT,
        transmission TEXT,
        license_plate TEXT,
        fipe_code TEXT,
        fipe_price NUMERIC,
        market_price_low NUMERIC,
        market_price_avg NUMERIC,
        market_price_high NUMERIC,
        expected_resale_price NUMERIC,
        condition_score INT,
        checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
        estimated_repair_cost NUMERIC NOT NULL DEFAULT 0,
        documentation_cost NUMERIC NOT NULL DEFAULT 0,
        desired_margin_percent NUMERIC NOT NULL DEFAULT 12,
        suggested_offer_price NUMERIC,
        min_offer_price NUMERIC,
        max_offer_price NUMERIC,
        final_offer_price NUMERIC,
        offer_expires_at TIMESTAMPTZ,
        pricing_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        evaluated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trade_appraisals_dealership_status
      ON trade_appraisals (dealership_id, status, updated_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trade_appraisals_lead
      ON trade_appraisals (dealership_id, lead_id, created_at DESC)
      WHERE lead_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trade_appraisals_vehicle_identity
      ON trade_appraisals (dealership_id, brand, model, year);
    `);
  }
};
