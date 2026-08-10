import { describe, expect, it } from "vitest";

import { loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("parses a valid environment", () => {
    const env = loadEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      ML_SERVICE_URL: "http://localhost:8000",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      PORT: "4000",
      ML_SERVICE_TIMEOUT_MS: "3000",
    });

    expect(env.PORT).toBe(4000);
    expect(env.ML_SERVICE_TIMEOUT_MS).toBe(3000);
    expect(env.DATABASE_URL).toContain("localhost");
  });

  it("applies default PORT and timeout when omitted", () => {
    const env = loadEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      ML_SERVICE_URL: "http://localhost:8000",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(env.PORT).toBe(4000);
    expect(env.ML_SERVICE_TIMEOUT_MS).toBe(5000);
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      loadEnv({
        ML_SERVICE_URL: "http://localhost:8000",
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("throws when ML_SERVICE_URL is not a valid url", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        ML_SERVICE_URL: "not-a-url",
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      })
    ).toThrow();
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        ML_SERVICE_URL: "http://localhost:8000",
        SUPABASE_URL: "https://project.supabase.co",
      })
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
