import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { IncompleteFeaturesError, MlServiceError } from "../services/riskService.js";
import { NotificationDeliveryError } from "../notifications/provider.js";
import { UnauthorizedError } from "./auth.js";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorName = err instanceof Error ? err.name : "UnknownError";
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.log(`[${req.method} ${req.originalUrl}] ${errorName}: ${errorMessage}`);

  if (err instanceof ZodError) {
    res.status(400).json({ error: "validation_error", details: err.issues });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: "not_found", message: err.message });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: "forbidden", message: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: "unauthorized", message: err.message });
    return;
  }

  if (err instanceof IncompleteFeaturesError) {
    res.status(422).json({ error: "incomplete_features", message: err.message });
    return;
  }

  if (err instanceof MlServiceError) {
    res.status(502).json({ error: "ml_service_error", message: err.message });
    return;
  }

  if (err instanceof NotificationDeliveryError) {
    res.status(502).json({ error: "notification_delivery_error", channel: err.channel, message: err.message });
    return;
  }

  res.status(500).json({ error: "internal_server_error" });
}
