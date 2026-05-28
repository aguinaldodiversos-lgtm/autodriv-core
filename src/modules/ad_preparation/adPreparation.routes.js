const express = require("express");
const controller = require("./adPreparation.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/:vehicleId/preparation", auth, controller.getPreparation);
router.post("/:vehicleId/preparation/recalculate", auth, controller.recalculate);
router.post("/:vehicleId/preparation/override", auth, controller.createOverride);
router.get("/:vehicleId/ad-score", auth, controller.getPreparation);
router.post("/:vehicleId/ad-score/recalculate", auth, controller.recalculate);
router.post("/:vehicleId/suggestions/description", auth, controller.suggestDescription);
router.post("/:vehicleId/suggestions/price", auth, controller.suggestPrice);
router.post("/:vehicleId/suggestions/priority", auth, controller.suggestPriority);
router.post("/:vehicleId/suggestions/:suggestionId/accept", auth, controller.acceptSuggestion);
router.post("/:vehicleId/suggestions/:suggestionId/reject", auth, controller.rejectSuggestion);
router.post("/:vehicleId/publish", auth, controller.publish);

module.exports = router;
