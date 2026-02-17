const express = require("express");
const controller = require("./aiSettings.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.getSettings);
router.put("/", auth, controller.updateSettings);

module.exports = router;
