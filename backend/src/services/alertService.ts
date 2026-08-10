import type { AlertsRepository } from "../db/alertsRepository.js";
import type { HealthWorkersRepository } from "../db/healthWorkersRepository.js";
import type { UserProfilesRepository } from "../db/userProfilesRepository.js";
import { NotificationDeliveryError, type NotificationProvider } from "../notifications/provider.js";
import type { RiskService } from "./riskService.js";
import { buildAlertMessage } from "./alertMessage.js";
import type { Alert, HealthWorker, RiskAssessment, WardFeatures } from "../types/domain.js";

export interface AlertDispatchOutcome {
  wardId: string;
  riskAssessment: RiskAssessment;
  triggered: boolean;
  thresholdUsed: number;
  alerts: Alert[];
}

export interface AlertServiceDeps {
  healthWorkersRepository: HealthWorkersRepository;
  alertsRepository: AlertsRepository;
  userProfilesRepository: UserProfilesRepository;
  riskService: RiskService;
  smsProvider: NotificationProvider;
  whatsAppProvider: NotificationProvider;
  emailProvider: NotificationProvider;
  defaultTriggerThreshold: number;
}

async function dispatchToWorker(
  worker: HealthWorker,
  wardId: string,
  riskAssessment: RiskAssessment,
  message: string,
  deps: AlertServiceDeps
): Promise<Alert[]> {
  const channels: Array<{ channel: "sms" | "whatsapp" | "email"; provider: NotificationProvider; to: string }> = [
    { channel: "sms", provider: deps.smsProvider, to: worker.phoneNumber },
  ];

  if (worker.whatsappCapable) {
    channels.push({ channel: "whatsapp", provider: deps.whatsAppProvider, to: worker.phoneNumber });
  }

  if (worker.email) {
    channels.push({ channel: "email", provider: deps.emailProvider, to: worker.email });
  }

  const results: Alert[] = [];

  for (const { channel, provider, to } of channels) {
    try {
      const { providerMessageId } = await provider.send(to, message);
      results.push(
        await deps.alertsRepository.record({
          wardId,
          healthWorkerId: worker.id,
          channel,
          riskScore: riskAssessment.riskScore,
          riskLabel: riskAssessment.riskLabel,
          message,
          status: "sent",
          providerMessageId,
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof NotificationDeliveryError ? error.message : (error as Error).message;

      results.push(
        await deps.alertsRepository.record({
          wardId,
          healthWorkerId: worker.id,
          channel,
          riskScore: riskAssessment.riskScore,
          riskLabel: riskAssessment.riskLabel,
          message,
          status: "failed",
          errorMessage,
        })
      );
    }
  }

  return results;
}

export function createAlertService(deps: AlertServiceDeps) {
  return {
    async evaluateAndDispatch(
      wardId: string,
      wardName: string,
      lgaId: string,
      features: WardFeatures
    ): Promise<AlertDispatchOutcome> {
      const riskAssessment = await deps.riskService.assessWard(features);

      const resolvedThreshold = await deps.userProfilesRepository.resolveEffectiveThreshold(wardId, lgaId);
      const thresholdUsed = resolvedThreshold ?? deps.defaultTriggerThreshold;

      const triggered = riskAssessment.riskScore >= thresholdUsed;

      if (!triggered) {
        return { wardId, riskAssessment, triggered: false, thresholdUsed, alerts: [] };
      }

      const workers = await deps.healthWorkersRepository.listByWard(wardId);
      const message = buildAlertMessage(wardName, riskAssessment.riskLabel, riskAssessment.riskScore);

      const alerts: Alert[] = [];
      for (const worker of workers) {
        const workerAlerts = await dispatchToWorker(worker, wardId, riskAssessment, message, deps);
        alerts.push(...workerAlerts);
      }

      return { wardId, riskAssessment, triggered: true, thresholdUsed, alerts };
    },
  };
}

export type AlertService = ReturnType<typeof createAlertService>;
