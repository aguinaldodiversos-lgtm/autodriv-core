const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./afterSales.controller");

const router = express.Router();

router.get("/opportunities", auth, controller.list);
router.post("/opportunities/generate", auth, controller.generate);
router.patch("/opportunities/:id", auth, controller.update);

module.exports = router;
