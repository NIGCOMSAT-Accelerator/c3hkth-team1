import { describe, expect, it, vi } from "vitest";

import { createAlertService } from "../src/services/alertService.js";
import { NotificationDeliveryError } from "../src/notifications/provider.js";
import type { AlertsRepository } from "../src/db/alertsRepository.js";
import type { HealthWorkersRepository } from "../src/db/healthWorkersRepository.js";
import type { UserProfilesRepository } from "../src/db/userProfilesRepository.js";
import type { NotificationProvider } from "../src/notifications/provider.js";
import type { RiskService } from "../src/services/riskService.js";
import type { Alert, HealthWorker, RiskAssessment, WardFeatures } from "../src/types/domain.js";

const wardId = "ward-1";
const lgaId = "lga-1";

const features: WardFeatures = {
  wardId,
  waterFraction: 0.7,
  rainfallAnomalyMm: 20,
  populationDensity: 400,
};

const worker: HealthWorker = {
  id: "worker-1",
  wardId,
  fullName: "Amaka Obi",
  role: "chew",
  phoneNumber: "+2348012345678",
  email: null,
  whatsappCapable: true,
  createdAt: new Date().toISOString(),
};

const workerWithEmail: HealthWorker = { ...worker, email: "amaka@example.com" };

function buildRiskService(assessment: RiskAssessment): RiskService {
  return { assessWard: vi.fn().mockResolvedValue(assessment) };
}

function buildHealthWorkersRepository(workers: HealthWorker[]): HealthWorkersRepository {
  return {
    register: vi.fn(),
    listByWard: vi.fn().mockResolvedValue(workers),
  };
}

function buildAlertsRepository(): AlertsRepository {
  let counter = 0;
  return {
    record: vi.fn(async (alert) => {
      counter += 1;
      return { ...alert, id: `alert-${counter}`, createdAt: new Date().toISOString() } as Alert;
    }),
    listByWard: vi.fn(),
  };
}

function buildUserProfilesRepository(resolvedThreshold: number | null): UserProfilesRepository {
  return {
    upsert: vi.fn(),
    getById: vi.fn(),
    updateThreshold: vi.fn(),
    resolveEffectiveThreshold: vi.fn().mockResolvedValue(resolvedThreshold),
  };
}

function buildSucceedingProvider(providerMessageId: string): NotificationProvider {
  return { send: vi.fn().mockResolvedValue({ providerMessageId }) };
}

function buildFailingProvider(channel: "sms" | "whatsapp" | "email", message: string): NotificationProvider {
  return { send: vi.fn().mockRejectedValue(new NotificationDeliveryError(channel, message)) };
}

describe("alertService.evaluateAndDispatch", () => {
  it("does not dispatch when risk score is below the default threshold and no override exists", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([worker]);

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.4, riskLabel: "moderate", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.triggered).toBe(false);
    expect(outcome.thresholdUsed).toBe(0.66);
    expect(outcome.alerts).toHaveLength(0);
    expect(healthWorkersRepository.listByWard).not.toHaveBeenCalled();
  });

  it("uses the resolved ward/lga override threshold instead of the default when one exists", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([worker]);

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(0.3),
      riskService: buildRiskService({ wardId, riskScore: 0.4, riskLabel: "moderate", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.thresholdUsed).toBe(0.3);
    expect(outcome.triggered).toBe(true);
  });

  it("dispatches via sms and whatsapp, but not email, when the worker has no email on file", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([worker]);
    const smsProvider = buildSucceedingProvider("sms-1");
    const whatsAppProvider = buildSucceedingProvider("wa-1");
    const emailProvider = buildSucceedingProvider("email-1");

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.82, riskLabel: "high", contributingFactors: {} }),
      smsProvider,
      whatsAppProvider,
      emailProvider,
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.triggered).toBe(true);
    expect(outcome.alerts).toHaveLength(2);
    expect(outcome.alerts.map((alert) => alert.channel).sort()).toEqual(["sms", "whatsapp"]);
    expect(emailProvider.send).not.toHaveBeenCalled();
    expect(smsProvider.send).toHaveBeenCalledWith(worker.phoneNumber, expect.stringContaining("Adankolo"));
    expect(whatsAppProvider.send).toHaveBeenCalledWith(worker.phoneNumber, expect.stringContaining("Adankolo"));
  });

  it("dispatches via all three channels when the worker has an email on file", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([workerWithEmail]);
    const emailProvider = buildSucceedingProvider("email-1");

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.82, riskLabel: "high", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider,
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.alerts).toHaveLength(3);
    expect(outcome.alerts.map((alert) => alert.channel).sort()).toEqual(["email", "sms", "whatsapp"]);
    expect(emailProvider.send).toHaveBeenCalledWith(workerWithEmail.email, expect.stringContaining("Adankolo"));
  });

  it("records a failed alert for a channel that throws, without blocking the other channels", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([workerWithEmail]);

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.9, riskLabel: "high", contributingFactors: {} }),
      smsProvider: buildFailingProvider("sms", "termii unreachable"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.alerts).toHaveLength(3);
    const smsAlert = outcome.alerts.find((alert) => alert.channel === "sms");
    const whatsAppAlert = outcome.alerts.find((alert) => alert.channel === "whatsapp");
    const emailAlert = outcome.alerts.find((alert) => alert.channel === "email");

    expect(smsAlert?.status).toBe("failed");
    expect(smsAlert?.errorMessage).toBe("termii unreachable");
    expect(whatsAppAlert?.status).toBe("sent");
    expect(emailAlert?.status).toBe("sent");
  });

  it("dispatches to every registered worker when multiple are present", async () => {
    const secondWorker: HealthWorker = { ...worker, id: "worker-2", phoneNumber: "+2348099999999" };
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([worker, secondWorker]);

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.7, riskLabel: "high", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.alerts).toHaveLength(4);
  });

  it("skips whatsapp entirely when the worker is not marked whatsapp-capable", async () => {
    const notWhatsappCapable: HealthWorker = { ...worker, whatsappCapable: false };
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([notWhatsappCapable]);
    const whatsAppProvider = buildSucceedingProvider("wa-1");

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.8, riskLabel: "high", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider,
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.alerts).toHaveLength(1);
    expect(outcome.alerts[0]?.channel).toBe("sms");
    expect(whatsAppProvider.send).not.toHaveBeenCalled();
  });

  it("triggers exactly at the default threshold boundary", async () => {
    const alertsRepository = buildAlertsRepository();
    const healthWorkersRepository = buildHealthWorkersRepository([worker]);

    const service = createAlertService({
      healthWorkersRepository,
      alertsRepository,
      userProfilesRepository: buildUserProfilesRepository(null),
      riskService: buildRiskService({ wardId, riskScore: 0.66, riskLabel: "high", contributingFactors: {} }),
      smsProvider: buildSucceedingProvider("sms-1"),
      whatsAppProvider: buildSucceedingProvider("wa-1"),
      emailProvider: buildSucceedingProvider("email-1"),
      defaultTriggerThreshold: 0.66,
    });

    const outcome = await service.evaluateAndDispatch(wardId, "Adankolo", lgaId, features);

    expect(outcome.triggered).toBe(true);
  });
});
