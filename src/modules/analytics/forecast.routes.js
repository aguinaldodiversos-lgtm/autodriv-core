const express = require("express");
const controller = require("./forecast.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/monthly", auth, controller.getMonthlyForecast);

module.exports = router;
