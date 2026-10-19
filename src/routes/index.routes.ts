import { Router } from "express";

import plansRouter from "../modules/plans/plans.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import usageRouter from "./usage.routes.js";
import accountsRouter from "./accounts.routes.js";

const router = Router();

router.use("/plans", plansRouter);
// router.use("/users", usersRouter);
// router.use("/accounts", accountsRouter);
// router.use("/usage", usageRouter);

export default router;
