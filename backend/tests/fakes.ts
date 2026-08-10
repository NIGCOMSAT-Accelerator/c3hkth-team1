import { vi } from "vitest";

import type { AlertsRepository } from "../src/db/alertsRepository.js";
import type { AuditLogsRepository } from "../src/db/auditLogsRepository.js";
import type { HealthWorkersRepository } from "../src/db/healthWorkersRepository.js";
import type { UserProfilesRepository } from "../src/db/userProfilesRepository.js";
import type { WardsRepository } from "../src/db/wardsRepository.js";
import type { AlertService } from "../src/services/alertService.js";
import type { RiskService } from "../src/services/riskService.js";
import type {
  Alert,
  HealthWorker,
  RiskAssessment,
  UserProfile,
  Ward,
  WardFeatures,
} from "../src/types/domain.js";

const sampleWard: Ward = {
  id: "9c858901-8a57-4791-81fe-4c455b099bc9",
  name: "Adankolo",
  lgaId: "b6e2b6a0-2a3f-4f1a-9a3a-3d4b1c2d9e11",
  lgaName: "Lokoja",
  state: "Kogi",
};

const otherWard: Ward = {
  id: "1e2d3c4b-5a69-4f7e-8d9c-0a1b2c3d4e5f",
  name: "Bassa",
  lgaId: "c7f3c7b1-3b4f-5f2b-0b4b-4e5c2d3e0f22",
  lgaName: "Bassa",
  state: "Kogi",
};

const sampleFeatures: WardFeatures = {
  wardId: sampleWard.id,
  waterFraction: 0.55,
  rainfallAnomalyMm: 18.2,
  populationDensity: 410.0,
};

const governmentProfile: UserProfile = {
  id: "auth-user-1",
  fullName: "Test Official",
  role: "government",
  lgaId: null,
  wardId: null,
  alertThreshold: null,
  phoneNumber: null,
  isWhatsappCapable: true,
  createdAt: new Date().toISOString(),
};

export function createFakeWardsRepository(overrides: Partial<WardsRepository> = {}): WardsRepository {
  return {
    listWards: async () => [sampleWard],
    getWardById: async (wardId: string) => (wardId === sampleWard.id ? sampleWard : null),
    getLatestFeatures: async () => sampleFeatures,
    updateCachedRisk: async () => undefined,
    ...overrides,
  };
}

export function createFakeHealthWorkersRepository(
  overrides: Partial<HealthWorkersRepository> = {}
): HealthWorkersRepository {
  return {
    register: async (input) =>
      ({
        id: "b3f5c8a1-1111-4444-9999-abcdefabcdef",
        wardId: input.wardId,
        fullName: input.fullName,
        role: input.role,
        phoneNumber: input.phoneNumber,
        email: input.email ?? null,
        whatsappCapable: input.whatsappCapable ?? true,
        createdAt: new Date().toISOString(),
      }) satisfies HealthWorker,
    listByWard: async () => [],
    ...overrides,
  };
}

export function createFakeRiskService(overrides: Partial<RiskService> = {}): RiskService {
  return {
    assessWard: async (features) =>
      ({
        wardId: features.wardId,
        riskScore: 0.71,
        riskLabel: "high",
        contributingFactors: { water_fraction: 0.5, rainfall_anomaly_mm: 0.3, population_density: 0.2 },
      }) satisfies RiskAssessment,
    ...overrides,
  };
}

export function createFakeAlertsRepository(overrides: Partial<AlertsRepository> = {}): AlertsRepository {
  return {
    record: async (alert) =>
      ({ ...alert, id: "alert-1", createdAt: new Date().toISOString() }) satisfies Alert,
    listByWard: async () => [],
    countByStatusForWards: async () => ({ sent: 0, failed: 0 }),
    getAnalyticsForWards: async () => ({
      byChannel: {
        sms: { sent: 0, failed: 0 },
        whatsapp: { sent: 0, failed: 0 },
        email: { sent: 0, failed: 0 },
      },
      byDay: [],
    }),
    listRecentForWards: async () => [],
    listPaginatedForWards: async () => ({ alerts: [], total: 0 }),
    ...overrides,
  };
}

export function createFakeAlertService(overrides: Partial<AlertService> = {}): AlertService {
  return {
    evaluateAndDispatch: async (wardId) => ({
      wardId,
      riskAssessment: {
        wardId,
        riskScore: 0.71,
        riskLabel: "high",
        contributingFactors: {},
      },
      triggered: true,
      thresholdUsed: 0.66,
      alerts: [],
    }),
    ...overrides,
  };
}

export function createFakeUserProfilesRepository(
  overrides: Partial<UserProfilesRepository> = {}
): UserProfilesRepository {
  return {
    upsert: async (profile) =>
      ({
        ...profile,
        lgaId: profile.lgaId ?? null,
        wardId: profile.wardId ?? null,
        alertThreshold: null,
        phoneNumber: profile.phoneNumber ?? null,
        isWhatsappCapable: profile.isWhatsappCapable ?? true,
        createdAt: new Date().toISOString(),
      }) satisfies UserProfile,
    getById: async () => governmentProfile,
    updateThreshold: async (id, alertThreshold) => ({ ...governmentProfile, id, alertThreshold }),
    resolveEffectiveThreshold: async () => null,
    ...overrides,
  };
}

export function createFakeAuditLogsRepository(
  overrides: Partial<AuditLogsRepository> = {}
): AuditLogsRepository {
  return {
    record: async (entry) =>
      ({
        id: "audit-1",
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? {},
        createdAt: new Date().toISOString(),
      }),
    listPaginated: async () => ({ logs: [], total: 0 }),
    ...overrides,
  };
}

export function createFakeSupabaseClient(userId = "auth-user-1", email = "official@example.com") {
  return {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (!token) {
          return { data: { user: null }, error: { message: "no token" } };
        }
        return { data: { user: { id: userId, email } }, error: null };
      }),
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

export { governmentProfile, otherWard, sampleFeatures, sampleWard };
