const service = require("./fipe.service");

async function brands(req, res) {
  try {
    res.json(await service.listBrands(req.query.type));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function models(req, res) {
  try {
    res.json(await service.listModels(req.query.type, req.query.brandCode));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function years(req, res) {
  try {
    res.json(await service.listYears(req.query.type, req.query.brandCode, req.query.modelCode));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function value(req, res) {
  try {
    res.json(
      await service.getValue(
        req.query.type,
        req.query.brandCode,
        req.query.modelCode,
        req.query.yearCode
      )
    );
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

module.exports = {
  brands,
  models,
  years,
  value
};
