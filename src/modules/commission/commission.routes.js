const express = require("express");
const controller = require("./commission.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getCommission);

module.exports = router;
