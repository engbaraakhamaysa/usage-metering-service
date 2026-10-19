import "dotenv/config";

import app from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

///////////////////////////////////////////////////////
// Start the HTTP server
///////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
