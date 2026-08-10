import type { SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";

import { createAuthMiddleware, createRequireToken } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAuditLogsRouter } from "./routes/auditLogs.js";
import { createHealthWorkersRouter } from "./routes/healthWorkers.js";
import { createPublicReferenceRouter } from "./routes/publicReference.js";
import { createUsersRouter } from "./routes/users.js";
import { createWardsRouter } from "./routes/wards.js";
import type { AlertsRepository } from "./db/alertsRepository.js";
import type { AuditLogsRepository } from "./db/auditLogsRepository.js";
import type { HealthWorkersRepository } from "./db/healthWorkersRepository.js";
import type { UserProfilesRepository } from "./db/userProfilesRepository.js";
import type { WardsRepository } from "./db/wardsRepository.js";
import type { AlertService } from "./services/alertService.js";
import type { RiskService } from "./services/riskService.js";

export interface AppDependencies {
  wardsRepository: WardsRepository;
  healthWorkersRepository: HealthWorkersRepository;
  alertsRepository: AlertsRepository;
  userProfilesRepository: UserProfilesRepository;
  auditLogsRepository: AuditLogsRepository;
  riskService: RiskService;
  alertService: AlertService;
  supabase: SupabaseClient;
}

export function createApp(deps: AppDependencies): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    res.on("finish", () => {
      console.log(`[${req.method} ${req.originalUrl}] ${res.statusCode}`);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const requireToken = createRequireToken(deps.supabase);
  const requireAuth = createAuthMiddleware(deps.supabase, deps.userProfilesRepository);

  app.use("/public", createPublicReferenceRouter(deps.wardsRepository));
  app.use(
    "/users",
    requireToken,
    createUsersRouter(
      deps.userProfilesRepository,
      deps.healthWorkersRepository,
      deps.wardsRepository,
      deps.auditLogsRepository
    )
  );
  app.use(
    "/wards",
    requireAuth,
    createWardsRouter(
      deps.wardsRepository,
      deps.riskService,
      deps.alertService,
      deps.alertsRepository,
      deps.auditLogsRepository
    )
  );
  app.use(
    "/health-workers",
    requireAuth,
    createHealthWorkersRouter(deps.healthWorkersRepository, deps.auditLogsRepository)
  );
  app.use("/audit-logs", requireAuth, createAuditLogsRouter(deps.auditLogsRepository));

  app.use(errorHandler);

  return app;
}
