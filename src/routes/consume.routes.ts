import { Router } from "express";
import { consumeSchema } from "../schemas/consume.schema.js";

const router = Router();

// Test endpoint for validating quota consumption requests
router.post("/test-json", (req, res) => {
  const result = consumeSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid request data",
      details: result.error.issues,
    });
    return;
  }

  res.status(200).json({
    received: true,
    data: result.data,
  });
});

export default router;
