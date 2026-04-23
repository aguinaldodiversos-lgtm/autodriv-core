const express = require("express");
const controller = require("./forecast.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/monthly", auth, controller.getMonthlyForecast);

module.exports = router;
