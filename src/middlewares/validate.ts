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

import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

type ValidationSource = "body" | "params";

export function validate(schema: z.ZodType, source: ValidationSource = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === "body" ? req.body : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues,
      });
      return;
    }

    if (source === "body") {
      req.body = result.data;
    }

    next();
  };
}
