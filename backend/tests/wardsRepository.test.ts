import { describe, expect, it, vi } from "vitest";

import { createWardsRepository } from "../src/db/wardsRepository.js";
import type { DbPool } from "../src/db/pool.js";

function fakePool(queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>): DbPool {
  return { query: vi.fn(queryImpl) } as unknown as DbPool;
}

describe("wardsRepository.listWards", () => {
  it("maps rows into Ward objects", async () => {
    const pool = fakePool(async () => ({
      rows: [
        { id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" },
      ],
    }));

    const repository = createWardsRepository(pool);
    const wards = await repository.listWards({ role: "government", lgaId: null, wardId: null });

    expect(wards).toEqual([
      {
        id: "ward-1",
        name: "Adankolo",
        lgaId: "lga-1",
        lgaName: "Lokoja",
        state: "Kogi",
        satelliteImageUrl: null,
        satelliteImageUpdatedAt: null,
        cachedRiskScore: null,
        cachedRiskLabel: null,
        cachedContributingFactors: null,
        cachedRiskUpdatedAt: null,
      },
    ]);
  });
});

describe("wardsRepository.getWardById", () => {
  it("returns null when no row matches", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createWardsRepository(pool);

    const ward = await repository.getWardById("missing-id");

    expect(ward).toBeNull();
  });

  it("returns the mapped ward when found", async () => {
    const pool = fakePool(async () => ({
      rows: [{ id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" }],
    }));
    const repository = createWardsRepository(pool);

    const ward = await repository.getWardById("ward-1");

    expect(ward?.name).toBe("Adankolo");
    expect(ward?.satelliteImageUrl).toBeNull();
  });

  it("returns the satellite image fields when present", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "ward-1",
          name: "Adankolo",
          lga_id: "lga-1",
          lga_name: "Lokoja",
          state: "Kogi",
          satellite_image_url: "https://r2.example.com/ward-1.png",
          satellite_image_updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createWardsRepository(pool);

    const ward = await repository.getWardById("ward-1");

    expect(ward?.satelliteImageUrl).toBe("https://r2.example.com/ward-1.png");
    expect(ward?.satelliteImageUpdatedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("wardsRepository.getLatestFeatures", () => {
  it("maps known metrics and defaults missing ones to null", async () => {
    const pool = fakePool(async () => ({
      rows: [
        { metric_name: "water_fraction", metric_value: 0.4 },
        { metric_name: "rainfall_anomaly_mm", metric_value: 12.0 },
      ],
    }));
    const repository = createWardsRepository(pool);

    const features = await repository.getLatestFeatures("ward-1");

    expect(features).toEqual({
      wardId: "ward-1",
      waterFraction: 0.4,
      rainfallAnomalyMm: 12.0,
      populationDensity: null,
    });
  });

  it("returns all nulls when there are no observations", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createWardsRepository(pool);

    const features = await repository.getLatestFeatures("ward-1");

    expect(features).toEqual({
      wardId: "ward-1",
      waterFraction: null,
      rainfallAnomalyMm: null,
      populationDensity: null,
    });
  });
});

describe("wardsRepository.updateCachedRisk", () => {
  it("writes the risk fields and passes contributing factors as JSON", async () => {
    const pool = fakePool(async (sql, params) => {
      expect(sql).toContain("update wards");
      expect(sql).toContain("cached_risk_score = $2");
      expect(sql).toContain("cached_risk_updated_at = now()");
      expect(params).toEqual(["ward-1", 0.8, "high", JSON.stringify({ water_fraction: 0.6 })]);
      return { rows: [] };
    });
    const repository = createWardsRepository(pool);

    await repository.updateCachedRisk("ward-1", 0.8, "high", { water_fraction: 0.6 });

    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe("wardsRepository.listWards cache fields", () => {
  it("maps cached risk columns onto each ward", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "ward-1",
          name: "Adankolo",
          lga_id: "lga-1",
          lga_name: "Lokoja",
          state: "Kogi",
          cached_risk_score: 0.72,
          cached_risk_label: "high",
          cached_contributing_factors: { water_fraction: 0.5 },
          cached_risk_updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createWardsRepository(pool);

    const wards = await repository.listWards({ role: "government", lgaId: null, wardId: null });

    expect(wards[0]?.cachedRiskScore).toBe(0.72);
    expect(wards[0]?.cachedRiskLabel).toBe("high");
    expect(wards[0]?.cachedContributingFactors).toEqual({ water_fraction: 0.5 });
  });

  it("defaults cache fields to null when not yet computed", async () => {
    const pool = fakePool(async () => ({
      rows: [{ id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" }],
    }));
    const repository = createWardsRepository(pool);

    const wards = await repository.listWards({ role: "government", lgaId: null, wardId: null });

    expect(wards[0]?.cachedRiskScore).toBeNull();
    expect(wards[0]?.cachedRiskUpdatedAt).toBeNull();
  });
});
