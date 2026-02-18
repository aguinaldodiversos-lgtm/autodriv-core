const service = require("./leadsImport.service");

async function importCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo CSV não enviado" });
    }

    const result = await service.importLeads(
      req.file.buffer,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao importar leads" });
  }
}

module.exports = {
  importCSV
};
