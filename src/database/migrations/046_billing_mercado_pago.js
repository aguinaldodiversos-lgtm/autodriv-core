module.exports = {
  name: "046_billing_mercado_pago",

  async up(pool) {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    `);

    await pool.query(`
      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_role_check;
    `);

    await pool.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN (
          'super_admin',
          'support',
          'admin',
          'manager',
          'seller',
          'maintenance',
          'financeiro',
          'operador',
          'auditor',
          'ia_agent'
        ));
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_plans (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'BRL',
        interval_type TEXT NOT NULL DEFAULT 'months',
        interval_count INTEGER NOT NULL DEFAULT 1,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        mercado_pago_plan_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_subscriptions (
        id SERIAL PRIMARY KEY,
        dealership_id INTEGER NOT NULL,
        user_id INTEGER,
        plan_id INTEGER REFERENCES billing_plans(id),
        provider TEXT NOT NULL DEFAULT 'mercado_pago',
        provider_subscription_id TEXT,
        provider_payer_id TEXT,
        external_reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'payment_pending',
        provider_status TEXT,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        next_billing_date TIMESTAMPTZ,
        grace_until TIMESTAMPTZ,
        suspended_at TIMESTAMPTZ,
        canceled_at TIMESTAMPTZ,
        last_payment_status TEXT,
        last_payment_id TEXT,
        last_sync_at TIMESTAMPTZ,
        manual_override_reason TEXT,
        manual_override_by INTEGER,
        manual_override_at TIMESTAMPTZ,
        checkout_url TEXT,
        raw_provider_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT account_subscriptions_status_check CHECK (status IN (
          'trialing',
          'active',
          'payment_pending',
          'past_due',
          'grace_period',
          'suspended',
          'canceled',
          'manual_override_active',
          'manual_override_blocked'
        ))
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'mercado_pago',
        event_type TEXT,
        provider_event_id TEXT NOT NULL UNIQUE,
        provider_resource_id TEXT,
        action TEXT,
        x_request_id TEXT,
        signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
        raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        processed_at TIMESTAMPTZ,
        processing_status TEXT NOT NULL DEFAULT 'received',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_payments (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER REFERENCES account_subscriptions(id),
        provider_payment_id TEXT UNIQUE,
        provider_authorized_payment_id TEXT UNIQUE,
        status TEXT,
        status_detail TEXT,
        amount NUMERIC(12,2),
        currency TEXT DEFAULT 'BRL',
        due_date TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_entitlements (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
        feature_key TEXT NOT NULL,
        limit_value TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (plan_id, feature_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_account_subscriptions_dealership
        ON account_subscriptions(dealership_id);
      CREATE INDEX IF NOT EXISTS idx_account_subscriptions_provider_subscription
        ON account_subscriptions(provider_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_account_subscriptions_status
        ON account_subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_billing_events_resource
        ON billing_events(provider_resource_id);
      CREATE INDEX IF NOT EXISTS idx_billing_payments_subscription
        ON billing_payments(subscription_id);
    `);

    await pool.query(`
      INSERT INTO billing_plans (code, name, description, amount, currency, interval_type, interval_count, active)
      VALUES
        ('starter', 'Starter', 'Plano inicial para lojas pequenas.', 0, 'BRL', 'months', 1, TRUE),
        ('pro', 'Pro', 'Plano comercial para operacao em crescimento.', 0, 'BRL', 'months', 1, TRUE),
        ('master', 'Master', 'Plano completo com automacoes e IA.', 0, 'BRL', 'months', 1, TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO plan_entitlements (plan_id, feature_key, limit_value, enabled)
      SELECT id, feature_key, limit_value, enabled
      FROM billing_plans
      CROSS JOIN (
        VALUES
          ('vehicles:create', NULL, TRUE),
          ('vehicles:update', NULL, TRUE),
          ('ads:generate', NULL, TRUE),
          ('images:upload', NULL, TRUE),
          ('whatsapp:connect', NULL, TRUE),
          ('ia:execute', NULL, TRUE)
      ) AS ent(feature_key, limit_value, enabled)
      ON CONFLICT (plan_id, feature_key) DO NOTHING;
    `);
  }
};
