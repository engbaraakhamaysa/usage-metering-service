import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

type ValidationSource = "body" | "params" | "query";

///////////////////////////////////////////////////////
// Validate request data and store the parsed result
///////////////////////////////////////////////////////
export function validate<T extends z.ZodType>(
  schema: T,
  source: ValidationSource = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        errors: result.error.issues,
      });
      return;
    }

    switch (source) {
      case "body":
        res.locals.validatedBody = result.data;
        break;

      case "params":
        res.locals.validatedParams = result.data;
        break;

      case "query":
        res.locals.validatedQuery = result.data;
        break;
    }

    next();
  };
}
