const express = require("express");
const controller = require("./leadsImport.controller");
const auth = require("../../middlewares/auth.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post(
  "/csv",
  auth,
  upload.single("file"),
  controller.importCSV
);

module.exports = router;
