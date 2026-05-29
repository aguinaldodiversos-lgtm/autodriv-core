const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./tradeAppraisals.controller");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/", auth, controller.create);
router.get("/:id", auth, controller.get);
router.patch("/:id", auth, controller.update);
router.post("/:id/recalculate", auth, controller.recalculate);
router.post("/:id/offer", auth, controller.offer);
router.post("/:id/accept", auth, controller.accept);
router.post("/:id/reject", auth, controller.reject);
router.post("/:id/convert-to-stock", auth, controller.convertToStock);

module.exports = router;
