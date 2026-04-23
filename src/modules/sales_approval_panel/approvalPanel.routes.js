const express = require("express");
const controller = require("./approvalPanel.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/:saleId", auth, controller.getPanel);

module.exports = router;
