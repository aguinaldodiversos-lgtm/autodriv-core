const express = require("express");
const controller = require("./ranking.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getRanking);

module.exports = router;
