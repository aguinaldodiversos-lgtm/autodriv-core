const service = require("./ads.service");

async function generate(req, res) {
  try {
    const ad = await service.generateAd(req.body, req.user);
    res.json(ad);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const ads = await service.listAds(
      req.params.vehicleId,
      req.user
    );
    res.json(ads);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  generate,
  list
};
