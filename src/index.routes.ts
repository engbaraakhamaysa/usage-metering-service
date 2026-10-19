import { Router } from "express";

import plansRouter from "./modules/plans/plans.routes.js";
import usersRouter from "./modules/users/users.routes.js";
import accountsRouter from "./modules/accounts/accounts.routes.js";
import usageRouter from "./modules/usage/usage.routes.js";

const router = Router();

///////////////////////////////////////////////////////
// Mount API modules
///////////////////////////////////////////////////////
router.use("/plans", plansRouter);
router.use("/users", usersRouter);
router.use("/accounts", accountsRouter);
router.use("/usage", usageRouter);

export default router;
