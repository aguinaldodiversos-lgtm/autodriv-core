const express = require("express");
const controller = require("./inbox.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.list);
router.get("/:leadId", auth, controller.get);
router.post("/:leadId/send", auth, controller.send);

module.exports = router;
