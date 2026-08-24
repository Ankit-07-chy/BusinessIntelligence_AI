import type { Response } from "express";

export function notImplemented(res: Response, feature: string) {
  return res.status(501).json({
    status: "not_implemented",
    message: `${feature} is defined in the API surface but not yet implemented.`,
  });
}
