const express = require("express");
const controller = require("./notification.controller");
const auth = require("../../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getNotifications);

module.exports = router;
