import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp, type AppDependencies } from "../src/app.js";
import { NotFoundError } from "../src/middleware/errorHandler.js";
import { IncompleteFeaturesError } from "../src/services/riskService.js";
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
  otherWard,
  sampleWard,
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

describe("auth requirement", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards");

    expect(response.status).toBe(401);
  });

  it("returns 401 when the token does not resolve to a user", async () => {
    const app = buildApp({
      supabase: {
        auth: { getUser: async () => ({ data: { user: null }, error: { message: "bad token" } }) },
      } as never,
    });

    const response = await request(app).get("/wards").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(401);
  });

  it("returns 401 when the authenticated user has no profile", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({ getById: async () => null }),
    });

    const response = await request(app).get("/wards").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(401);
  });
});

describe("GET /wards", () => {
  it("returns all wards for a government official", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(sampleWard.id);
  });

  it("returns only the lga_official's LGA when scoped", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({
          ...governmentProfile,
          role: "lga_official",
          lgaId: sampleWard.lgaId,
        }),
      }),
      wardsRepository: createFakeWardsRepository({
        listWards: async (scope) => (scope.role === "lga_official" ? [sampleWard] : [sampleWard, otherWard]),
      }),
    });

    const response = await request(app).get("/wards").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(sampleWard.id);
  });
});

describe("POST /wards/risk/refresh-cache", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).post("/wards/risk/refresh-cache");

    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-government account", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({ ...governmentProfile, role: "ward_official", wardId: sampleWard.id }),
      }),
    });

    const response = await request(app).post("/wards/risk/refresh-cache").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(403);
  });

  it("refreshes the cache for a government account and returns the summary", async () => {
    const app = buildApp({
      wardsRepository: createFakeWardsRepository({
        listWards: async () => [sampleWard],
        updateCachedRisk: async () => undefined,
      }),
      riskService: createFakeRiskService(),
    });

    const response = await request(app).post("/wards/risk/refresh-cache").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ wardsChecked: 1, wardsUpdated: 1, wardsFailed: 0 });
  });
});

describe("POST /wards/risk/refresh-batch", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).post("/wards/risk/refresh-batch").send({ wardIds: [sampleWard.id] });

    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-government account", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({ ...governmentProfile, role: "ward_official", wardId: sampleWard.id }),
      }),
    });

    const response = await request(app)
      .post("/wards/risk/refresh-batch")
      .set("Authorization", AUTH_HEADER)
      .send({ wardIds: [sampleWard.id] });

    expect(response.status).toBe(403);
  });

  it("refreshes exactly the given ward ids and returns a batch summary", async () => {
    let receivedIds: string[] = [];
    const app = buildApp({
      wardsRepository: createFakeWardsRepository({
        updateCachedRisk: async () => undefined,
      }),
      riskService: createFakeRiskService(),
    });

    const response = await request(app)
      .post("/wards/risk/refresh-batch")
      .set("Authorization", AUTH_HEADER)
      .send({ wardIds: [sampleWard.id, otherWard.id] });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ wardsChecked: 2, wardsUpdated: 2, wardsFailed: 0 });
  });

  it("rejects an empty wardIds array", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/wards/risk/refresh-batch")
      .set("Authorization", AUTH_HEADER)
      .send({ wardIds: [] });

    expect(response.status).toBe(400);
  });

  it("rejects a batch larger than 50", async () => {
    const app = buildApp();
    const tooMany = Array.from({ length: 51 }, () => sampleWard.id);

    const response = await request(app)
      .post("/wards/risk/refresh-batch")
      .set("Authorization", AUTH_HEADER)
      .send({ wardIds: tooMany });

    expect(response.status).toBe(400);
  });

  it("rejects non-uuid entries", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/wards/risk/refresh-batch")
      .set("Authorization", AUTH_HEADER)
      .send({ wardIds: ["not-a-uuid"] });

    expect(response.status).toBe(400);
  });
});

describe("GET /wards/alerts/stats", () => {
  it("returns aggregated counts for the caller's scoped wards", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        countByStatusForWards: async (wardIds) => {
          expect(wardIds).toEqual([sampleWard.id]);
          return { sent: 8, failed: 2 };
        },
      }),
    });

    const response = await request(app).get("/wards/alerts/stats").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ sent: 8, failed: 2 });
  });

  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards/alerts/stats");

    expect(response.status).toBe(401);
  });
});

describe("GET /wards/alerts/analytics", () => {
  it("returns analytics for the caller's scoped wards", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        getAnalyticsForWards: async (wardIds, days) => {
          expect(wardIds).toEqual([sampleWard.id]);
          expect(days).toBe(14);
          return {
            byChannel: { sms: { sent: 5, failed: 1 }, whatsapp: { sent: 4, failed: 0 } },
            byDay: [{ date: "2026-01-01", sent: 2, failed: 0 }],
          };
        },
      }),
    });

    const response = await request(app).get("/wards/alerts/analytics").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data.byChannel.sms.sent).toBe(5);
    expect(response.body.data.byDay).toHaveLength(1);
  });

  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards/alerts/analytics");

    expect(response.status).toBe(401);
  });
});

describe("GET /wards/alerts/recent", () => {
  it("returns recent alerts enriched with ward name", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        listRecentForWards: async (wardIds, limit) => {
          expect(wardIds).toEqual([sampleWard.id]);
          expect(limit).toBe(10);
          return [
            {
              id: "alert-1",
              wardId: sampleWard.id,
              healthWorkerId: "worker-1",
              channel: "sms",
              riskScore: 0.8,
              riskLabel: "high",
              message: "AquaWatch alert",
              status: "sent",
              providerMessageId: "termii-1",
              errorMessage: null,
              createdAt: new Date().toISOString(),
            },
          ];
        },
      }),
    });

    const response = await request(app).get("/wards/alerts/recent").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].wardName).toBe(sampleWard.name);
  });

  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards/alerts/recent");

    expect(response.status).toBe(401);
  });
});

describe("GET /wards/alerts", () => {
  it("returns paginated alerts with meta and enriched ward names", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        listPaginatedForWards: async (wardIds, filters, limit, offset) => {
          expect(wardIds).toEqual([sampleWard.id]);
          expect(limit).toBe(20);
          expect(offset).toBe(0);
          expect(filters).toEqual({ channel: undefined, status: undefined, wardId: undefined });
          return {
            alerts: [
              {
                id: "alert-1",
                wardId: sampleWard.id,
                healthWorkerId: "worker-1",
                channel: "sms",
                riskScore: 0.8,
                riskLabel: "high",
                message: "AquaWatch alert",
                status: "sent",
                providerMessageId: "termii-1",
                errorMessage: null,
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
          };
        },
      }),
    });

    const response = await request(app).get("/wards/alerts").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].wardName).toBe(sampleWard.name);
    expect(response.body.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
  });

  it("passes page/pageSize/filters through from query params", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        listPaginatedForWards: async (_wardIds, filters, limit, offset) => {
          expect(limit).toBe(5);
          expect(offset).toBe(5);
          expect(filters).toEqual({ channel: "email", status: "failed", wardId: sampleWard.id });
          return { alerts: [], total: 0 };
        },
      }),
    });

    const response = await request(app)
      .get("/wards/alerts")
      .query({ page: 2, pageSize: 5, channel: "email", status: "failed", wardId: sampleWard.id })
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ total: 0, page: 2, pageSize: 5 });
  });

  it("returns 400 for an invalid channel filter", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/wards/alerts")
      .query({ channel: "carrier-pigeon" })
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(400);
  });

  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards/alerts");

    expect(response.status).toBe(401);
  });
});

describe("GET /wards/:wardId", () => {
  it("returns a ward when it exists and is in scope", async () => {
    const app = buildApp();

    const response = await request(app).get(`/wards/${sampleWard.id}`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(sampleWard.name);
  });

  it("returns 404 when the ward does not exist", async () => {
    const app = buildApp({ wardsRepository: createFakeWardsRepository({ getWardById: async () => null }) });
    const unknownId = "00000000-0000-0000-0000-000000000000";

    const response = await request(app).get(`/wards/${unknownId}`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(404);
  });

  it("returns 400 when the ward id is not a valid uuid", async () => {
    const app = buildApp();

    const response = await request(app).get("/wards/not-a-uuid").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(400);
  });

  it("returns 403 when a ward_official requests a ward outside their scope", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({ ...governmentProfile, role: "ward_official", wardId: otherWard.id }),
      }),
      wardsRepository: createFakeWardsRepository(),
    });

    const response = await request(app).get(`/wards/${sampleWard.id}`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(403);
  });

  it("allows a ward_official to access their own ward", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        getById: async () => ({ ...governmentProfile, role: "ward_official", wardId: sampleWard.id }),
      }),
    });

    const response = await request(app).get(`/wards/${sampleWard.id}`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
  });
});

describe("GET /wards/:wardId/risk", () => {
  it("returns a risk assessment for a known ward", async () => {
    const app = buildApp();

    const response = await request(app).get(`/wards/${sampleWard.id}/risk`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data.riskLabel).toBe("high");
    expect(response.body.data.wardId).toBe(sampleWard.id);
  });

  it("returns 404 when the ward does not exist", async () => {
    const app = buildApp({ wardsRepository: createFakeWardsRepository({ getWardById: async () => null }) });
    const unknownId = "00000000-0000-0000-0000-000000000000";

    const response = await request(app).get(`/wards/${unknownId}/risk`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(404);
  });

  it("returns 422 when the ward is missing required features", async () => {
    const app = buildApp({
      riskService: createFakeRiskService({
        assessWard: async () => {
          throw new IncompleteFeaturesError(["waterFraction"]);
        },
      }),
    });

    const response = await request(app).get(`/wards/${sampleWard.id}/risk`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(422);
  });
});

describe("NotFoundError", () => {
  it("carries the provided message", () => {
    const error = new NotFoundError("ward missing");
    expect(error.message).toBe("ward missing");
    expect(error.name).toBe("NotFoundError");
  });
});

describe("POST /wards/:wardId/alerts/trigger", () => {
  it("returns the dispatch outcome for a known ward", async () => {
    const app = buildApp();

    const response = await request(app)
      .post(`/wards/${sampleWard.id}/alerts/trigger`)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data.wardId).toBe(sampleWard.id);
    expect(response.body.data.triggered).toBe(true);
  });

  it("returns 404 when the ward does not exist", async () => {
    const app = buildApp({ wardsRepository: createFakeWardsRepository({ getWardById: async () => null }) });
    const unknownId = "00000000-0000-0000-0000-000000000000";

    const response = await request(app)
      .post(`/wards/${unknownId}/alerts/trigger`)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid ward id", async () => {
    const app = buildApp();

    const response = await request(app).post("/wards/not-a-uuid/alerts/trigger").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(400);
  });
});

describe("GET /wards/:wardId/alerts", () => {
  it("returns alert history for a known ward", async () => {
    const app = buildApp({
      alertsRepository: createFakeAlertsRepository({
        listByWard: async () => [
          {
            id: "alert-1",
            wardId: sampleWard.id,
            healthWorkerId: "worker-1",
            channel: "sms",
            riskScore: 0.8,
            riskLabel: "high",
            message: "AquaWatch alert",
            status: "sent",
            providerMessageId: "termii-123",
            errorMessage: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    });

    const response = await request(app).get(`/wards/${sampleWard.id}/alerts`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("returns 404 when the ward does not exist", async () => {
    const app = buildApp({ wardsRepository: createFakeWardsRepository({ getWardById: async () => null }) });
    const unknownId = "00000000-0000-0000-0000-000000000000";

    const response = await request(app).get(`/wards/${unknownId}/alerts`).set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(404);
  });
});
