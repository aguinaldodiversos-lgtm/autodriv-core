module.exports = {
  name: "027_whatsapp_update",

  async up(client) {
    await client.query(`
      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS name TEXT;

      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS phone_number TEXT;

      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'zapi';

      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS provider_instance TEXT;

      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS provider_token TEXT;

      ALTER TABLE whatsapp_instances
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name='whatsapp_instances'
          AND column_name='phone'
        ) THEN
          UPDATE whatsapp_instances
          SET phone_number = phone
          WHERE phone_number IS NULL;
        END IF;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_phone
      ON whatsapp_instances(phone_number);
    `);
  }
};
