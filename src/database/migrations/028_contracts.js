exports.up = async function (knex) {
  await knex.schema.createTable("contracts", (table) => {
    table.increments("id").primary();
    table.integer("sale_id").references("id").inTable("sales").onDelete("CASCADE");
    table.integer("dealership_id").references("id").inTable("dealerships");
    table.integer("version").notNullable();
    table.string("file_path").notNullable();
    table.string("hash").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("contracts");
};
