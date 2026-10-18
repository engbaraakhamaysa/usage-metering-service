// import { NextFunction, Request, Response } from "express";
// import type { z } from "zod";

// export function validate(schema: z.ZodType) {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const result = schema.safeParse(req.body);

//     if (!result.success) {
//       return res
//         .status(400)
//         .json({ message: "Validation failed", errors: result.error.issues });
//     }
//     // Replace the request body with the validated data
//     req.body = result.data;
//     next();
//   };
// }

// import type { Request, Response, NextFunction } from "express";
// import type { z } from "zod";

// type ValidationSource = "body" | "params";

// export function validate(schema: z.ZodType, source: ValidationSource = "body") {
//   return (req: Request, res: Response, next: NextFunction): void => {
//     const data = source === "body" ? req.body : req.params;
//     const result = schema.safeParse(data);

//     if (!result.success) {
//       res.status(400).json({
//         message: "Validation failed",
//         errors: result.error.issues,
//       });
//       return;
//     }

//     if (source === "body") {
//       req.body = result.data;
//     }

//     next();
//   };
// }
import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

type ValidationSource = "body" | "params" | "query";

// Store validated request data in Express response locals.
type ValidatedLocals = {
  validatedBody?: unknown;
  validatedParams?: unknown;
  validatedQuery?: unknown;
};

// Validate request data using a Zod schema.
export function validate<T extends z.ZodType>(
  schema: T,
  source: ValidationSource = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data =
      source === "body"
        ? req.body
        : source === "params"
          ? req.params
          : req.query;

    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues,
      });
      return;
    }

    const locals = res.locals as ValidatedLocals;

    switch (source) {
      case "body":
        locals.validatedBody = result.data;
        break;

      case "params":
        locals.validatedParams = result.data;
        break;

      case "query":
        locals.validatedQuery = result.data;
        break;
    }

    next();
  };
}
