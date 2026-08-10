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
  sampleWard,
} from "./fakes.js";

const AUTH_HEADER = "Bearer fake-token";

function buildApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    wardsRepository: createFakeWardsRepository(),
    healthWorkersRepository: createFakeHealthWorkersRepository(),
    alertsRepository: createFakeAlertsRepository(),
    userProfilesRepository: createFakeUserProfilesRepository(),
    auditLogsRepository: createFakeAuditLogsRepository(),
    riskService: createFakeRiskService(),
    alertService: createFakeAlertService(),
    supabase: createFakeSupabaseClient(),
    ...overrides,
  });
}

const validPayload = {
  wardId: sampleWard.id,
  fullName: "Amaka Obi",
  role: "chew",
  phoneNumber: "+2348012345678",
  email: "amaka@example.com",
};

describe("POST /health-workers", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).post("/health-workers").send(validPayload);

    expect(response.status).toBe(401);
  });

  it("registers a valid health worker", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/health-workers")
      .set("Authorization", AUTH_HEADER)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.fullName).toBe(validPayload.fullName);
    expect(response.body.data.wardId).toBe(sampleWard.id);
  });

  it("rejects an invalid payload with 400", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/health-workers")
      .set("Authorization", AUTH_HEADER)
      .send({ ...validPayload, phoneNumber: "not-a-phone" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation_error");
  });

  it("rejects a missing required field", async () => {
    const app = buildApp();
    const { fullName: _fullName, ...withoutName } = validPayload;

    const response = await request(app)
      .post("/health-workers")
      .set("Authorization", AUTH_HEADER)
      .send(withoutName);

    expect(response.status).toBe(400);
  });
});

describe("GET /health-workers/ward/:wardId", () => {
  it("returns registered workers for a ward", async () => {
    const app = buildApp({
      healthWorkersRepository: createFakeHealthWorkersRepository({
        listByWard: async () => [
          {
            id: "b3f5c8a1-1111-4444-9999-abcdefabcdef",
            wardId: sampleWard.id,
            fullName: "Amaka Obi",
            role: "chew",
            phoneNumber: "+2348012345678",
            email: null,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    });

    const response = await request(app)
      .get(`/health-workers/ward/${sampleWard.id}`)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("returns 400 for an invalid ward id", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/health-workers/ward/not-a-uuid")
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(400);
  });
});
