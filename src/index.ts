import express from "express";
import apiRouter from "./routes/index.routes.js";

const app = express();

app.use(express.json());

const PORT = process.env.PORT;
console.log(PORT);

app.use("/api", apiRouter);

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
