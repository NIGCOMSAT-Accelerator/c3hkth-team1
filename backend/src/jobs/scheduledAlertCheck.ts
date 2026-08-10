import type { AlertService } from "../services/alertService.js";
import type { AuditLogsRepository } from "../db/auditLogsRepository.js";
import type { WardsRepository } from "../db/wardsRepository.js";

export interface ScheduledAlertCheckDeps {
  wardsRepository: WardsRepository;
  alertService: AlertService;
  auditLogsRepository: AuditLogsRepository;
}

export interface ScheduledAlertCheckSummary {
  wardsChecked: number;
  wardsTriggered: number;
  wardsFailed: number;
}

export async function runScheduledAlertCheck(deps: ScheduledAlertCheckDeps): Promise<ScheduledAlertCheckSummary> {
  const wards = await deps.wardsRepository.listWards({ role: "government", lgaId: null, wardId: null });

  let wardsTriggered = 0;
  let wardsFailed = 0;

  for (const ward of wards) {
    try {
      const features = await deps.wardsRepository.getLatestFeatures(ward.id);
      const outcome = await deps.alertService.evaluateAndDispatch(ward.id, ward.name, ward.lgaId, features);

      await deps.wardsRepository.updateCachedRisk(
        ward.id,
        outcome.riskAssessment.riskScore,
        outcome.riskAssessment.riskLabel,
        outcome.riskAssessment.contributingFactors
      );

      if (outcome.triggered) {
        wardsTriggered += 1;
        await deps.auditLogsRepository.record({
          actorId: null,
          actorEmail: null,
          action: "alert.cron_triggered",
          targetType: "ward",
          targetId: ward.id,
          metadata: {
            riskScore: outcome.riskAssessment.riskScore,
            thresholdUsed: outcome.thresholdUsed,
            alertsSent: outcome.alerts.length,
          },
        });
      }
    } catch (error) {
      wardsFailed += 1;
      console.error(`scheduled alert check failed for ward ${ward.id}:`, (error as Error).message);
    }
  }

  return { wardsChecked: wards.length, wardsTriggered, wardsFailed };
}
