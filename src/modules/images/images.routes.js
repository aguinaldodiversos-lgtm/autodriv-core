const express = require("express");
const multer = require("multer");
const controller = require("./images.controller");
const auth = require("../../middlewares/auth");
const upload = require("../../middlewares/upload.middleware");
const { requireBillingEntitlement } = require("../billing/entitlement.guard");

const router = express.Router();

/**
 * Trata erros do multer (tamanho, tipo) com status explícito — antes do controller.
 */
function vehicleImageUpload(req, res, next) {
  const handler = upload.single("image");
  handler(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FIELD_VALUE") {
        return res
          .status(413)
          .json({ error: "Ficheiro demasiado grande" });
      }
    }
    const msg = err.message || "Erro no upload";
    if (/não permitido|TIPO|tipo de arquivo|mimetype/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    return next(err);
  });
}

router.post(
  "/:vehicleId",
  auth,
  requireBillingEntitlement("images:upload"),
  vehicleImageUpload,
  controller.upload
);

router.get("/:vehicleId", auth, controller.list);

module.exports = router;
