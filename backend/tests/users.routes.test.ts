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

describe("POST /users/profile", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .send({ fullName: "Amaka Obi", role: "government" });

    expect(response.status).toBe(401);
  });

  it("creates a government profile with no ward/lga required", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "government" });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe("government");
  });

  it("rejects an lga_official payload missing lgaId", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "lga_official" });

    expect(response.status).toBe(400);
  });

  it("accepts an lga_official payload with lgaId", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "lga_official", lgaId: sampleWard.lgaId, phoneNumber: "+2348012345678" });

    expect(response.status).toBe(201);
  });

  it("rejects a ward_official payload missing wardId", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "ward_official" });

    expect(response.status).toBe(400);
  });

  it("rejects a ward_official payload missing phoneNumber", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "ward_official", wardId: sampleWard.id });

    expect(response.status).toBe(400);
  });

  it("auto-registers a ward_official as a health worker for their ward", async () => {
    const registerCalls: unknown[] = [];
    const app = buildApp({
      healthWorkersRepository: createFakeHealthWorkersRepository({
        register: async (input) => {
          registerCalls.push(input);
          return {
            id: "worker-1",
            wardId: input.wardId,
            fullName: input.fullName,
            role: input.role,
            phoneNumber: input.phoneNumber,
            email: input.email ?? null,
            whatsappCapable: input.whatsappCapable ?? true,
            createdAt: new Date().toISOString(),
          };
        },
      }),
    });

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({
        fullName: "Amaka Obi",
        role: "ward_official",
        wardId: sampleWard.id,
        phoneNumber: "+2348012345678",
        isWhatsappCapable: false,
      });

    expect(response.status).toBe(201);
    expect(registerCalls).toHaveLength(1);
    expect(registerCalls[0]).toMatchObject({
      wardId: sampleWard.id,
      role: "chew",
      phoneNumber: "+2348012345678",
      whatsappCapable: false,
    });
  });

  it("auto-registers an lga_official as a health worker for every ward in their lga", async () => {
    const registerCalls: unknown[] = [];
    const app = buildApp({
      wardsRepository: createFakeWardsRepository({
        listWards: async () => [sampleWard, otherWard],
      }),
      healthWorkersRepository: createFakeHealthWorkersRepository({
        register: async (input) => {
          registerCalls.push(input);
          return {
            id: "worker-1",
            wardId: input.wardId,
            fullName: input.fullName,
            role: input.role,
            phoneNumber: input.phoneNumber,
            email: input.email ?? null,
            whatsappCapable: input.whatsappCapable ?? true,
            createdAt: new Date().toISOString(),
          };
        },
      }),
    });

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({
        fullName: "Amaka Obi",
        role: "lga_official",
        lgaId: sampleWard.lgaId,
        phoneNumber: "+2348012345678",
      });

    expect(response.status).toBe(201);
    expect(registerCalls).toHaveLength(2);
    expect(registerCalls.map((call) => (call as { wardId: string }).wardId).sort()).toEqual(
      [sampleWard.id, otherWard.id].sort()
    );
    expect(registerCalls[0]).toMatchObject({ role: "lga_coordinator" });
  });

  it("does not auto-register a government signup as a health worker", async () => {
    let registerCalled = false;
    const app = buildApp({
      healthWorkersRepository: createFakeHealthWorkersRepository({
        register: async () => {
          registerCalled = true;
          throw new Error("should not be called");
        },
      }),
    });

    const response = await request(app)
      .post("/users/profile")
      .set("Authorization", AUTH_HEADER)
      .send({ fullName: "Amaka Obi", role: "government" });

    expect(response.status).toBe(201);
    expect(registerCalled).toBe(false);
  });
});

describe("GET /users/me", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/users/me");

    expect(response.status).toBe(401);
  });

  it("returns the caller's own profile", async () => {
    const app = buildApp();

    const response = await request(app).get("/users/me").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("government");
  });
});

describe("PATCH /users/threshold", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).patch("/users/threshold").send({ alertThreshold: 0.5 });

    expect(response.status).toBe(401);
  });

  it("updates the threshold and returns the mapped profile", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        updateThreshold: async (id, alertThreshold) => ({
          id,
          fullName: "Amaka Obi",
          role: "ward_official",
          lgaId: null,
          wardId: "ward-1",
          alertThreshold,
          createdAt: new Date().toISOString(),
        }),
      }),
    });

    const response = await request(app)
      .patch("/users/threshold")
      .set("Authorization", AUTH_HEADER)
      .send({ alertThreshold: 0.45 });

    expect(response.status).toBe(200);
    expect(response.body.data.alertThreshold).toBe(0.45);
  });

  it("accepts null to clear an override back to the system default", async () => {
    const app = buildApp({
      userProfilesRepository: createFakeUserProfilesRepository({
        updateThreshold: async (id) => ({
          id,
          fullName: "Amaka Obi",
          role: "ward_official",
          lgaId: null,
          wardId: "ward-1",
          alertThreshold: null,
          createdAt: new Date().toISOString(),
        }),
      }),
    });

    const response = await request(app)
      .patch("/users/threshold")
      .set("Authorization", AUTH_HEADER)
      .send({ alertThreshold: null });

    expect(response.status).toBe(200);
    expect(response.body.data.alertThreshold).toBeNull();
  });

  it("rejects a threshold outside the 0-1 range", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/users/threshold")
      .set("Authorization", AUTH_HEADER)
      .send({ alertThreshold: 1.5 });

    expect(response.status).toBe(400);
  });

  it("rejects a missing alertThreshold field", async () => {
    const app = buildApp();

    const response = await request(app).patch("/users/threshold").set("Authorization", AUTH_HEADER).send({});

    expect(response.status).toBe(400);
  });
});
