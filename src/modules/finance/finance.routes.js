const express = require("express");
const controller = require("./finance.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/", auth, controller.create);
router.put("/:id/pay", auth, controller.pay);
router.get("/summary", auth, controller.summary);

module.exports = router;
