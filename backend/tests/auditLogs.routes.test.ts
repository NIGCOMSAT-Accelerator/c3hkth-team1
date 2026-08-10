import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp, type AppDependencies } from "../src/app.js";
import {
  createFakeAlertService,
  createFakeAlertsRepository,
  createFakeAuditLogsRepository,
  createFakeHealthWorkersRepository,
  createFakeRiskService,
  createFakeSupabaseClient,
  createFakeUserProfilesRepository,
  createFakeWardsRepository,
  governmentProfile,
} from "./fakes.js";

const AUTH_HEADER = "Bearer fake-token";

function buildApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    wardsRepository: createFakeWardsRepository(),
    healthWorkersRepository: createFakeHealthWorkersRepository(),
    alertsRepository: createFakeAlertsRepository(),
    auditLogsRepository: createFakeAuditLogsRepository(),
    userProfilesRepository: createFakeUserProfilesRepository(),
    riskService: createFakeRiskService(),
    alertService: createFakeAlertService(),
    supabase: createFakeSupabaseClient(),
    ...overrides,
  });
}

describe("GET /audit-logs", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/audit-logs");

    expect(response.status).toBe(401);
  });

  it("returns paginated logs for a government account", async () => {
    const app = buildApp({
      auditLogsRepository: createFakeAuditLogsRepository({
        listPaginated: async (filters, limit, offset) => {
          expect(filters).toEqual({ action: undefined, actorId: undefined });
          expect(limit).toBe(20);
          expect(offset).toBe(0);
          return {
            logs: [
              {
                id: "audit-1",
                actorId: "user-1",
                actorEmail: "amaka@example.com",
                action: "threshold.updated",
                targetType: "user_profile",
                targetId: "user-1",
                metadata: { alertThreshold: 0.5 },
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
          };
        },
      }),
    });

    const response = await request(app).get("/audit-logs").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
  });

  it("returns 403 for a non-government account", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({ ...governmentProfile, role: "ward_official", wardId: "ward-1" }),
      }),
    });

    const response = await request(app).get("/audit-logs").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(403);
  });

  it("passes action and actorId filters through from query params", async () => {
    const app = buildApp({
      auditLogsRepository: createFakeAuditLogsRepository({
        listPaginated: async (filters) => {
          expect(filters).toEqual({ action: "alert.cron_triggered", actorId: undefined });
          return { logs: [], total: 0 };
        },
      }),
    });

    const response = await request(app)
      .get("/audit-logs")
      .query({ action: "alert.cron_triggered" })
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
  });
});
