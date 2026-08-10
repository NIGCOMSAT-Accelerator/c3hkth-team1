import { describe, expect, it, vi } from "vitest";

import { runScheduledAlertCheck } from "../src/jobs/scheduledAlertCheck.js";
import type { AlertService } from "../src/services/alertService.js";
import type { AuditLogsRepository } from "../src/db/auditLogsRepository.js";
import type { WardsRepository } from "../src/db/wardsRepository.js";
import type { Ward, WardFeatures } from "../src/types/domain.js";

const wardA: Ward = { id: "ward-a", name: "Adankolo", lgaId: "lga-1", lgaName: "Lokoja", state: "Kogi" };
const wardB: Ward = { id: "ward-b", name: "Bassa", lgaId: "lga-1", lgaName: "Lokoja", state: "Kogi" };

const features: WardFeatures = {
  wardId: "ward-a",
  waterFraction: 0.5,
  rainfallAnomalyMm: 10,
  populationDensity: 200,
};

function buildWardsRepository(wards: Ward[]): WardsRepository {
  return {
    listWards: vi.fn().mockResolvedValue(wards),
    getWardById: vi.fn(),
    getLatestFeatures: vi.fn().mockResolvedValue(features),
    updateCachedRisk: vi.fn().mockResolvedValue(undefined),
  };
}

function buildAuditLogsRepository(): AuditLogsRepository {
  return {
    record: vi.fn().mockResolvedValue({
      id: "audit-1",
      actorId: null,
      actorEmail: null,
      action: "alert.cron_triggered",
      targetType: "ward",
      targetId: null,
      metadata: {},
      createdAt: new Date().toISOString(),
    }),
    listPaginated: vi.fn(),
  };
}

describe("runScheduledAlertCheck", () => {
  it("requests wards with government-level unscoped access", async () => {
    const wardsRepository = buildWardsRepository([wardA]);
    const alertService: AlertService = {
      evaluateAndDispatch: vi.fn().mockResolvedValue({
        wardId: wardA.id,
        riskAssessment: { wardId: wardA.id, riskScore: 0.5, riskLabel: "moderate", contributingFactors: {} },
        triggered: false,
        thresholdUsed: 0.66,
        alerts: [],
      }),
    };

    await runScheduledAlertCheck({ wardsRepository, alertService, auditLogsRepository: buildAuditLogsRepository() });

    expect(wardsRepository.listWards).toHaveBeenCalledWith({ role: "government", lgaId: null, wardId: null });
  });

  it("counts triggered and untriggered wards correctly, logging only the triggered one", async () => {
    const wardsRepository = buildWardsRepository([wardA, wardB]);
    const auditLogsRepository = buildAuditLogsRepository();
    const alertService: AlertService = {
      evaluateAndDispatch: vi.fn().mockImplementation(async (wardId: string) => ({
        wardId,
        riskAssessment: { wardId, riskScore: 0.8, riskLabel: "high", contributingFactors: {} },
        triggered: wardId === wardA.id,
        thresholdUsed: 0.66,
        alerts: [],
      })),
    };

    const summary = await runScheduledAlertCheck({ wardsRepository, alertService, auditLogsRepository });

    expect(summary.wardsChecked).toBe(2);
    expect(summary.wardsTriggered).toBe(1);
    expect(summary.wardsFailed).toBe(0);
    expect(auditLogsRepository.record).toHaveBeenCalledTimes(1);
    expect(auditLogsRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "alert.cron_triggered", targetType: "ward", targetId: wardA.id })
    );
  });

  it("counts a failure and continues checking remaining wards", async () => {
    const wardsRepository = buildWardsRepository([wardA, wardB]);
    const auditLogsRepository = buildAuditLogsRepository();
    const alertService: AlertService = {
      evaluateAndDispatch: vi.fn().mockImplementation(async (wardId: string) => {
        if (wardId === wardA.id) {
          throw new Error("ml-service unreachable");
        }
        return {
          wardId,
          riskAssessment: { wardId, riskScore: 0.9, riskLabel: "high", contributingFactors: {} },
          triggered: true,
          thresholdUsed: 0.66,
          alerts: [],
        };
      }),
    };

    const summary = await runScheduledAlertCheck({ wardsRepository, alertService, auditLogsRepository });

    expect(summary.wardsChecked).toBe(2);
    expect(summary.wardsFailed).toBe(1);
    expect(summary.wardsTriggered).toBe(1);
    expect(alertService.evaluateAndDispatch).toHaveBeenCalledTimes(2);
  });

  it("returns all zeros when there are no wards", async () => {
    const wardsRepository = buildWardsRepository([]);
    const alertService: AlertService = { evaluateAndDispatch: vi.fn() };

    const summary = await runScheduledAlertCheck({
      wardsRepository,
      alertService,
      auditLogsRepository: buildAuditLogsRepository(),
    });

    expect(summary).toEqual({ wardsChecked: 0, wardsTriggered: 0, wardsFailed: 0 });
    expect(alertService.evaluateAndDispatch).not.toHaveBeenCalled();
  });
});
