import { Router } from "express";
import { createAccountController } from "../controllers/accounts.controller.js";
import { validate } from "../middlewares/validate.js";
import { createAccountSchema } from "../validator/accounts.validator.js";

const accountsRouter = Router();

accountsRouter.post(
  "/",
  validate(createAccountSchema),
  createAccountController,
);

// // GET /api/accounts - Get all accounts
// accountsRouter.get("/api/accounts", getAllAccountsController);

// // POST /api/accounts - Create a new account
// accountsRouter.post("/api/accounts", createAccountController);

// //Test
// accountsRouter.get("/", (req, res) => {
//   return res.send("Hello");
// });

export default accountsRouter;
