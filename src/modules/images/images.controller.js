const fs = require("fs");
const service = require("./images.service");

function cleanupUploadedFile(file) {
  if (!file || !file.path) return;
  const p = String(file.path);
  if (p.startsWith("http://") || p.startsWith("https://")) return;
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {
    // ignore: não mascarar o erro original do fluxo
  }
}

async function upload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Imagem não enviada" });
    }
    const image = await service.uploadVehicleImage(
      req.params.vehicleId,
      req.file,
      req.user
    );
    return res.json(image);
  } catch (err) {
    cleanupUploadedFile(req.file);
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message || "Erro" });
  }
}

/**
 * Rota de listagem: **privada**, mesmo escopo do POST — só a própria loja vê imagens
 * do veículo (não expõe mídia a outro tenant; não substitui o catálogo em /api/public).
 */
async function list(req, res) {
  try {
    const images = await service.listVehicleImages(req.params.vehicleId, req.user);
    return res.json(images);
  } catch (err) {
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message || "Erro" });
  }
}

module.exports = {
  upload,
  list
};
