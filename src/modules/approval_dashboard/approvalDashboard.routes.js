const express = require("express");
const controller = require("./approvalDashboard.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.listPending);

module.exports = router;
