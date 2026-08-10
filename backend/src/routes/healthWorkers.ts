import { Router } from "express";

import type { AuditLogsRepository } from "../db/auditLogsRepository.js";
import type { HealthWorkersRepository } from "../db/healthWorkersRepository.js";
import { registerHealthWorkerSchema, wardIdParamSchema } from "../schemas/validation.js";

export function createHealthWorkersRouter(
  healthWorkersRepository: HealthWorkersRepository,
  auditLogsRepository: AuditLogsRepository
): Router {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const input = registerHealthWorkerSchema.parse(req.body);
      const healthWorker = await healthWorkersRepository.register(input);

      await auditLogsRepository.record({
        actorId: req.userProfile?.id ?? null,
        actorEmail: req.authEmail ?? null,
        action: "health_worker.registered",
        targetType: "health_worker",
        targetId: healthWorker.id,
        metadata: { wardId: input.wardId, role: input.role },
      });

      res.status(201).json({ data: healthWorker });
    } catch (error) {
      next(error);
    }
  });

  router.get("/ward/:wardId", async (req, res, next) => {
    try {
      const { wardId } = wardIdParamSchema.parse(req.params);
      const workers = await healthWorkersRepository.listByWard(wardId);
      res.json({ data: workers });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
