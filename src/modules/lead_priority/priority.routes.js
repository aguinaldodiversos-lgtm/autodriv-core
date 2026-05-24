const express = require("express");
const controller = require("./priority.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getTopLeads);

module.exports = router;
