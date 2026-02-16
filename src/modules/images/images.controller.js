const repo = require("./images.repository");

async function upload(req, res) {
  try {
    const vehicleId = req.params.vehicleId;

    if (!req.file) {
      return res.status(400).json({ error: "Imagem não enviada" });
    }

    const image = await repo.create(
      vehicleId,
      req.file.path,
      false
    );

    res.json(image);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const images = await repo.list(req.params.vehicleId);
    res.json(images);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  upload,
  list
};
