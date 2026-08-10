import { describe, expect, it, vi } from "vitest";

import { refreshWardRiskCache } from "../src/jobs/refreshWardRiskCache.js";
import type { RiskService } from "../src/services/riskService.js";
import type { WardsRepository } from "../src/db/wardsRepository.js";
import type { Ward, WardFeatures } from "../src/types/domain.js";

const wardA: Ward = { id: "ward-a", name: "Adankolo", lgaId: "lga-1", lgaName: "Lokoja", state: "Kogi" };
const wardB: Ward = { id: "ward-b", name: "Bassa", lgaId: "lga-1", lgaName: "Lokoja", state: "Kogi" };

const features: WardFeatures = {
  wardId: "ward-a",
  waterFraction: 0.5,
  rainfallAnomalyMm: 10,
  populationDensity: 200,
};

function buildWardsRepository(wards: Ward[]): WardsRepository & { updateCachedRisk: ReturnType<typeof vi.fn> } {
  return {
    listWards: vi.fn().mockResolvedValue(wards),
    getWardById: vi.fn(),
    getLatestFeatures: vi.fn().mockResolvedValue(features),
    updateCachedRisk: vi.fn().mockResolvedValue(undefined),
  };
}

describe("refreshWardRiskCache", () => {
  it("requests wards with government-level unscoped access", async () => {
    const wardsRepository = buildWardsRepository([wardA]);
    const riskService: RiskService = {
      assessWard: vi.fn().mockResolvedValue({
        wardId: wardA.id,
        riskScore: 0.5,
        riskLabel: "moderate",
        contributingFactors: {},
      }),
    };

    await refreshWardRiskCache({ wardsRepository, riskService });

    expect(wardsRepository.listWards).toHaveBeenCalledWith({ role: "government", lgaId: null, wardId: null });
  });

  it("writes the cache for every ward and counts updates", async () => {
    const wardsRepository = buildWardsRepository([wardA, wardB]);
    const riskService: RiskService = {
      assessWard: vi.fn().mockImplementation(async (f: WardFeatures) => ({
        wardId: f.wardId,
        riskScore: 0.6,
        riskLabel: "moderate",
        contributingFactors: { water_fraction: 0.4 },
      })),
    };

    const summary = await refreshWardRiskCache({ wardsRepository, riskService });

    expect(summary).toEqual({ wardsChecked: 2, wardsUpdated: 2, wardsFailed: 0 });
    expect(wardsRepository.updateCachedRisk).toHaveBeenCalledTimes(2);
    expect(wardsRepository.updateCachedRisk).toHaveBeenCalledWith(wardA.id, 0.6, "moderate", {
      water_fraction: 0.4,
    });
  });

  it("counts a failure and continues checking remaining wards", async () => {
    const wardsRepository = buildWardsRepository([wardA, wardB]);
    const riskService: RiskService = {
      assessWard: vi.fn().mockImplementation(async (f: WardFeatures) => {
        if (f.wardId === "ward-a") {
          throw new Error("ml-service unreachable");
        }
        return { wardId: f.wardId, riskScore: 0.9, riskLabel: "high", contributingFactors: {} };
      }),
    };
    // getLatestFeatures always returns the same fixture, so make it reflect the current ward id
    wardsRepository.getLatestFeatures = vi
      .fn()
      .mockImplementation(async (wardId: string) => ({ ...features, wardId }));

    const summary = await refreshWardRiskCache({ wardsRepository, riskService });

    expect(summary.wardsChecked).toBe(2);
    expect(summary.wardsFailed).toBe(1);
    expect(summary.wardsUpdated).toBe(1);
  });

  it("returns all zeros when there are no wards", async () => {
    const wardsRepository = buildWardsRepository([]);
    const riskService: RiskService = { assessWard: vi.fn() };

    const summary = await refreshWardRiskCache({ wardsRepository, riskService });

    expect(summary).toEqual({ wardsChecked: 0, wardsUpdated: 0, wardsFailed: 0 });
    expect(riskService.assessWard).not.toHaveBeenCalled();
  });
});
