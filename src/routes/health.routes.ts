import { Router } from "express";

const router = Router();

// Check whether the service is running
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "usage-metering-service",
  });
});

export default router;
