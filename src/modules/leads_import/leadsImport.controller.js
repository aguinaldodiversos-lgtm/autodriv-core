const service = require("./leadsImport.service");

/* =========================
   IMPORTAR LEADS VIA CSV
========================= */
async function importCSV(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: "Arquivo CSV não enviado"
      });
    }

    const result = await service.importLeads(
      req.file.buffer,
      req.user
    );

    res.json({
      success: true,
      total_imported: result.total,
      leads: result.leads
    });
  } catch (err) {
    console.error("Leads import error:", err);
    res.status(500).json({
      error: "Erro ao importar leads"
    });
  }
}

module.exports = {
  importCSV
};
