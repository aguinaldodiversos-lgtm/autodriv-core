module.exports = {
  name: "001_dealerships",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dealerships (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
};
