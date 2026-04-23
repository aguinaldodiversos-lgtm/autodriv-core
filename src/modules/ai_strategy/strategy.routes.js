const express = require("express");
const controller = require("./strategy.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getStrategy);

module.exports = router;
