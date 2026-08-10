import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp, type AppDependencies } from "../src/app.js";
import { openApiSpec } from "../src/openapi.js";
import {
  createFakeAlertService,
  createFakeAlertsRepository,
  createFakeAuditLogsRepository,
  createFakeHealthWorkersRepository,
  createFakeRiskService,
  createFakeSupabaseClient,
  createFakeUserProfilesRepository,
  createFakeWardsRepository,
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

describe("GET /api-docs.json", () => {
  it("returns the OpenAPI spec without requiring authentication", async () => {
    const app = buildApp();

    const response = await request(app).get("/api-docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info.title).toBe("AquaWatch NG API");
  });

  it("documents every real route registered in the app", async () => {
    const app = buildApp();

    const response = await request(app).get("/api-docs.json");
    const documentedPaths = Object.keys(response.body.paths);

    const expectedPaths = [
      "/health",
      "/public/wards",
      "/users/profile",
      "/users/me",
      "/users/threshold",
      "/wards",
      "/wards/risk/refresh-cache",
      "/wards/risk/refresh-batch",
      "/wards/alerts/stats",
      "/wards/alerts/analytics",
      "/wards/alerts/recent",
      "/wards/alerts",
      "/wards/{wardId}",
      "/wards/{wardId}/risk",
      "/wards/{wardId}/alerts/trigger",
      "/wards/{wardId}/alerts",
      "/health-workers",
      "/health-workers/ward/{wardId}",
      "/audit-logs",
    ];

    for (const path of expectedPaths) {
      expect(documentedPaths).toContain(path);
    }
  });

  it("references only schemas that actually exist in components.schemas", () => {
    const serialized = JSON.stringify(openApiSpec);
    const refPattern = /"\$ref":"#\/components\/schemas\/(\w+)"/g;
    const definedSchemas = new Set(Object.keys(openApiSpec.components.schemas));

    let match: RegExpExecArray | null;
    const referencedSchemas = new Set<string>();
    while ((match = refPattern.exec(serialized.replace(/\s/g, ""))) !== null) {
      referencedSchemas.add(match[1] as string);
    }

    for (const schemaName of referencedSchemas) {
      expect(definedSchemas.has(schemaName)).toBe(true);
    }
  });
});

describe("GET /api-docs", () => {
  it("returns the Swagger UI page without requiring authentication", async () => {
    const app = buildApp();

    const response = await request(app).get("/api-docs/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });
});
