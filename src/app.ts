import express from "express";

import apiRouter from "./index.routes.js";

const app = express();

app.use(express.json());
app.use("/api", apiRouter);

export default app;
