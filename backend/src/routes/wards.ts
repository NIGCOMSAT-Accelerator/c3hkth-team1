import { Router } from "express";

import { ForbiddenError, NotFoundError } from "../middleware/errorHandler.js";
import type { AlertService } from "../services/alertService.js";
import type { RiskService } from "../services/riskService.js";
import { canAccessWard, type WardsRepository } from "../db/wardsRepository.js";
import type { AlertsRepository } from "../db/alertsRepository.js";
import type { AuditLogsRepository } from "../db/auditLogsRepository.js";
import { refreshWardRiskCache } from "../jobs/refreshWardRiskCache.js";
import { notificationsQuerySchema, wardIdParamSchema } from "../schemas/validation.js";

export function createWardsRouter(
  wardsRepository: WardsRepository,
  riskService: RiskService,
  alertService: AlertService,
  alertsRepository: AlertsRepository,
  auditLogsRepository: AuditLogsRepository
): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const profile = req.userProfile!;
      const wards = await wardsRepository.listWards({
        role: profile.role,
        lgaId: profile.lgaId,
        wardId: profile.wardId,
      });
      res.json({ data: wards });
    } catch (error) {
      next(error);
    }
  });

  router.post("/risk/refresh-cache", async (req, res, next) => {
    try {
      if (req.userProfile!.role !== "government") {
        throw new ForbiddenError("refreshing the risk cache is only available to government accounts");
      }

      const summary = await refreshWardRiskCache({ wardsRepository, riskService });
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts/stats", async (req, res, next) => {
    try {
      const profile = req.userProfile!;
      const wards = await wardsRepository.listWards({
        role: profile.role,
        lgaId: profile.lgaId,
        wardId: profile.wardId,
      });

      const counts = await alertsRepository.countByStatusForWards(wards.map((ward) => ward.id));
      res.json({ data: counts });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts/analytics", async (req, res, next) => {
    try {
      const profile = req.userProfile!;
      const wards = await wardsRepository.listWards({
        role: profile.role,
        lgaId: profile.lgaId,
        wardId: profile.wardId,
      });

      const days = 14;
      const analytics = await alertsRepository.getAnalyticsForWards(
        wards.map((ward) => ward.id),
        days
      );
      res.json({ data: analytics });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts/recent", async (req, res, next) => {
    try {
      const profile = req.userProfile!;
      const wards = await wardsRepository.listWards({
        role: profile.role,
        lgaId: profile.lgaId,
        wardId: profile.wardId,
      });

      const alerts = await alertsRepository.listRecentForWards(
        wards.map((ward) => ward.id),
        10
      );

      const wardsById = new Map(wards.map((ward) => [ward.id, ward]));
      const enriched = alerts.map((alert) => ({
        ...alert,
        wardName: wardsById.get(alert.wardId)?.name ?? "Unknown ward",
      }));

      res.json({ data: enriched });
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts", async (req, res, next) => {
    try {
      const profile = req.userProfile!;
      const wards = await wardsRepository.listWards({
        role: profile.role,
        lgaId: profile.lgaId,
        wardId: profile.wardId,
      });
      const wardIds = wards.map((ward) => ward.id);

      const query = notificationsQuerySchema.parse(req.query);
      const limit = query.pageSize;
      const offset = (query.page - 1) * query.pageSize;

      const { alerts, total } = await alertsRepository.listPaginatedForWards(
        wardIds,
        { channel: query.channel, status: query.status, wardId: query.wardId },
        limit,
        offset
      );

      const wardsById = new Map(wards.map((ward) => [ward.id, ward]));
      const enriched = alerts.map((alert) => ({
        ...alert,
        wardName: wardsById.get(alert.wardId)?.name ?? "Unknown ward",
      }));

      res.json({ data: enriched, meta: { total, page: query.page, pageSize: query.pageSize } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:wardId", async (req, res, next) => {
    try {
      const { wardId } = wardIdParamSchema.parse(req.params);
      const ward = await wardsRepository.getWardById(wardId);

      if (!ward) {
        throw new NotFoundError(`ward ${wardId} not found`);
      }

      if (!canAccessWard(req.userProfile!, ward)) {
        throw new ForbiddenError(`not authorized to access ward ${wardId}`);
      }

      res.json({ data: ward });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:wardId/risk", async (req, res, next) => {
    try {
      const { wardId } = wardIdParamSchema.parse(req.params);
      const ward = await wardsRepository.getWardById(wardId);

      if (!ward) {
        throw new NotFoundError(`ward ${wardId} not found`);
      }

      if (!canAccessWard(req.userProfile!, ward)) {
        throw new ForbiddenError(`not authorized to access ward ${wardId}`);
      }

      const features = await wardsRepository.getLatestFeatures(wardId);
      const assessment = await riskService.assessWard(features);

      res.json({ data: assessment });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:wardId/alerts/trigger", async (req, res, next) => {
    try {
      const { wardId } = wardIdParamSchema.parse(req.params);
      const ward = await wardsRepository.getWardById(wardId);

      if (!ward) {
        throw new NotFoundError(`ward ${wardId} not found`);
      }

      if (!canAccessWard(req.userProfile!, ward)) {
        throw new ForbiddenError(`not authorized to access ward ${wardId}`);
      }

      const features = await wardsRepository.getLatestFeatures(wardId);
      const outcome = await alertService.evaluateAndDispatch(wardId, ward.name, ward.lgaId, features);

      await auditLogsRepository.record({
        actorId: req.userProfile!.id,
        actorEmail: req.authEmail ?? null,
        action: "alert.manually_triggered",
        targetType: "ward",
        targetId: wardId,
        metadata: {
          triggered: outcome.triggered,
          riskScore: outcome.riskAssessment.riskScore,
          thresholdUsed: outcome.thresholdUsed,
          alertsSent: outcome.alerts.length,
        },
      });

      res.json({ data: outcome });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:wardId/alerts", async (req, res, next) => {
    try {
      const { wardId } = wardIdParamSchema.parse(req.params);
      const ward = await wardsRepository.getWardById(wardId);

      if (!ward) {
        throw new NotFoundError(`ward ${wardId} not found`);
      }

      if (!canAccessWard(req.userProfile!, ward)) {
        throw new ForbiddenError(`not authorized to access ward ${wardId}`);
      }

      const alerts = await alertsRepository.listByWard(wardId);
      res.json({ data: alerts });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
