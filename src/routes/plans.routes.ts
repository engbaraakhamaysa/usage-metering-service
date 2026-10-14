import { Router } from "express";
import {
  createPlanController,
  getAllPlansController,
  getPlanByIdController,
} from "../controllers/plans.controller.js";

const plansRouter = Router();

// GET /api/plans - Get all plans
plansRouter.get("/api/plans", getAllPlansController);

// GET /api/plans/:id - Get a plan by ID
plansRouter.get("/api/plans/:id", getPlanByIdController);

// POST /api/plans - Create a new plan
plansRouter.post("/api/plans", createPlanController);

export default plansRouter;
