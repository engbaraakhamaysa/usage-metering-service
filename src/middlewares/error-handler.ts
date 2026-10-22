import type { ErrorRequestHandler } from "express";

///////////////////////////////////////////////////////
// Handle request parsing and unexpected errors
///////////////////////////////////////////////////////
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
): void => {
  if (error instanceof Error && "type" in error) {
    if (error.type === "entity.parse.failed") {
      res.status(400).json({
        error: "Invalid JSON body",
      });
      return;
    }

    if (error.type === "entity.too.large") {
      res.status(413).json({
        error: "Request body is too large",
      });
      return;
    }
  }

  console.error("Unhandled request error:", error);

  res.status(500).json({
    error: "Internal server error",
  });
};
