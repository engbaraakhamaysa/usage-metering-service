import express from "express";
import plansRouter from "./routes/plans.routes.js";
import usersRouter from "./routes/users.routes.js";
import usageRouter from "./routes/usage.routes.js";

import accountsRouter from "./routes/accounts.routes.js";

const app = express();

app.use(express.json());

const PORT = 3000;

app.use(plansRouter);
app.use("/api/users", usersRouter);
app.use(accountsRouter);
app.use("/api/usage", usageRouter);

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
