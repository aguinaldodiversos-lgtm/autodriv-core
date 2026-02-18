const express = require("express");
const controller = require("./leadsImport.controller");
const auth = require("../../middlewares/auth.middleware");
const multer = require("multer");

/* =========================
   CONFIGURAÇÃO DO UPLOAD
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // limite: 2MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos CSV são permitidos"));
    }
  }
});

const router = express.Router();

/* =========================
   IMPORTAR LEADS VIA CSV
========================= */
router.post(
  "/csv",
  auth,
  upload.single("file"),
  controller.importCSV
);

module.exports = router;
