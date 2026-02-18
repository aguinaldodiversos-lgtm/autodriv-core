CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  zapi_instance TEXT NOT NULL,
  zapi_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_whatsapp_dealership
    FOREIGN KEY (dealership_id)
    REFERENCES dealerships(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_phone
ON whatsapp_instances(phone_number);
