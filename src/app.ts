import express from "express";

import apiRouter from "./index.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

const app = express();

app.use(express.json());
app.use("/api", apiRouter);

///////////////////////////////////////////////////////
// Handle routes that do not exist
///////////////////////////////////////////////////////
app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use(errorHandler);

export default app;
