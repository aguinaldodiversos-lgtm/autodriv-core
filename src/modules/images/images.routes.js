const express = require("express");
const controller = require("./images.controller");
const auth = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router.post(
  "/:vehicleId",
  auth,
  upload.single("image"),
  controller.upload
);

router.get("/:vehicleId", controller.list);

module.exports = router;
