import { Router } from "express";
import { z } from "zod";

import { ForbiddenError } from "../middleware/errorHandler.js";
import type { AuditLogsRepository } from "../db/auditLogsRepository.js";

const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
});

export function createAuditLogsRouter(auditLogsRepository: AuditLogsRepository): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      if (req.userProfile!.role !== "government") {
        throw new ForbiddenError("audit logs are only available to government accounts");
      }

      const query = auditLogsQuerySchema.parse(req.query);
      const limit = query.pageSize;
      const offset = (query.page - 1) * query.pageSize;

      const { logs, total } = await auditLogsRepository.listPaginated(
        { action: query.action, actorId: query.actorId },
        limit,
        offset
      );

      res.json({ data: logs, meta: { total, page: query.page, pageSize: query.pageSize } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
