const express = require("express");
const stationController = require("../controllers/stationController");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const {
  validateCreateStation,
  validateStationList,
  validateAdminStationList,
  validateStationId,
  validateUpdateStation,
  validateStationStatus,
} = require("../validators/stationValidator");

const router = express.Router();

router
  .route("/")
  .get(validateStationList, stationController.listStations)
  .post(authenticate, requireAdmin, validateCreateStation, stationController.createStation);

router.get("/admin", authenticate, requireAdmin, validateAdminStationList, stationController.listAdminStations);

router.patch(
  "/:id/status",
  authenticate,
  requireAdmin,
  validateStationId,
  validateStationStatus,
  stationController.updateStationStatus
);
router
  .route("/:id")
  .get(validateStationId, stationController.getStation)
  .patch(
    authenticate,
    requireAdmin,
    validateStationId,
    validateUpdateStation,
    stationController.updateStation
  )
  .delete(authenticate, requireAdmin, validateStationId, stationController.deactivateStation);

module.exports = router;
