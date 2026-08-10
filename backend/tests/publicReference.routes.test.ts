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

describe("GET /public/wards", () => {
  it("returns wards without requiring an Authorization header", async () => {
    const app = buildApp();

    const response = await request(app).get("/public/wards");

    expect(response.status).toBe(200);
    expect(response.body.data[0].id).toBe(sampleWard.id);
  });
});
