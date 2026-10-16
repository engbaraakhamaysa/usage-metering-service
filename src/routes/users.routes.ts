import { Router } from "express";
import {
  getAllUsersController,
  getUserByIdController,
  createUserController,
} from "../controllers/users.controller.js";

const router = Router();

router.get("/", getAllUsersController);
router.get("/:id", getUserByIdController);
router.post("/", createUserController);

export default router;
