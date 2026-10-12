import express from "express";

import { consumeSchema } from "./schemas/consume.schema.js";
import healthRouter from "./routes/health.routes.js";
import consumeRouter from "./routes/consume.routes.js";

const app = express();

app.use(express.json());

const PORT = 3000;
// Health check endpoint
app.use(healthRouter);

// Test endpoint for receiving JSON data
app.use(consumeRouter);

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
