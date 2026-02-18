const express = require("express");
const controller = require("./whatsapp.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/connect", auth, controller.connect);

module.exports = router;
