exports.up = async function (knex) {
  await knex.schema.alterTable("contracts", (table) => {
    table.string("status").defaultTo("draft"); 
    table.integer("approved_by").references("id").inTable("users");
    table.timestamp("approved_at");
    table.text("rejection_reason");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("contracts", (table) => {
    table.dropColumn("status");
    table.dropColumn("approved_by");
    table.dropColumn("approved_at");
    table.dropColumn("rejection_reason");
  });
};
