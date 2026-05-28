module.exports = {
  name: "047_whatsapp_ai_pre_attendance",

  async up(pool) {
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
      ADD COLUMN IF NOT EXISTS intent TEXT,
      ADD COLUMN IF NOT EXISTS intent_confidence NUMERIC,
      ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'first_contact',
      ADD COLUMN IF NOT EXISTS vehicle_interest_text TEXT,
      ADD COLUMN IF NOT EXISTS budget TEXT,
      ADD COLUMN IF NOT EXISTS financing_interest BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trade_in_interest BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS appraisal_interest BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trade_vehicle_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ai_whatsapp_status TEXT DEFAULT 'enabled',
      ADD COLUMN IF NOT EXISTS ai_auto_message_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_ai_processed_at TIMESTAMPTZ;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_active
      ON leads (dealership_id, whatsapp_phone, status, last_message_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_last_message
      ON leads (dealership_id, last_message_at DESC)
      WHERE source = 'whatsapp';
    `);

    await pool.query(`
      ALTER TABLE lead_conversations
      ADD COLUMN IF NOT EXISTS normalized_message TEXT,
      ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_intent TEXT,
      ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC,
      ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_conversations_external_message
      ON lead_conversations (dealership_id, channel, external_message_id)
      WHERE external_message_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_ai
      ON lead_conversations (dealership_id, ai_processed, created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS seller_actions (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
        assigned_seller_id INT REFERENCES users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        title TEXT NOT NULL,
        description TEXT,
        due_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_progress', 'done', 'dismissed')),
        source TEXT NOT NULL DEFAULT 'ai_whatsapp',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seller_actions_dealership_status
      ON seller_actions (dealership_id, status, priority, due_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seller_actions_lead
      ON seller_actions (lead_id, created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_ai_settings (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        ai_whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ai_auto_reply_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ai_handoff_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ai_max_auto_messages_per_lead INTEGER NOT NULL DEFAULT 5,
        ai_business_hours_only BOOLEAN NOT NULL DEFAULT FALSE,
        ai_after_hours_message TEXT,
        ai_graceful_handoff_message TEXT,
        ai_default_seller_id INT REFERENCES users(id) ON DELETE SET NULL,
        ai_escalation_threshold INTEGER NOT NULL DEFAULT 70,
        ai_low_confidence_threshold NUMERIC NOT NULL DEFAULT 0.65,
        ai_unknown_retry_limit INTEGER NOT NULL DEFAULT 1,
        ai_allowed_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
        ai_blocked_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        ai_reply_delay_seconds INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_ai_events (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        provider_message_id TEXT,
        event_type TEXT NOT NULL,
        intent TEXT,
        confidence NUMERIC,
        decision TEXT,
        status TEXT NOT NULL DEFAULT 'processed',
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_events_lead
      ON whatsapp_ai_events (lead_id, created_at DESC);
    `);
  }
};
