const express = require("express");
const controller = require("./whatsapp.controller");

const router = express.Router();

router.post("/webhook", controller.webhook);

module.exports = router;
