const express = require("express");
const controller = require("./distribution.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post("/distribute", auth, controller.distribute);
router.get("/admin-list", auth, controller.getAdminLeads);

module.exports = router;
