import { afterEach, describe, expect, it, vi } from "vitest";

import { IncompleteFeaturesError, MlServiceError, createRiskService } from "../src/services/riskService.js";
import type { WardFeatures } from "../src/types/domain.js";

const completeFeatures: WardFeatures = {
  wardId: "ward-001",
  waterFraction: 0.6,
  rainfallAnomalyMm: 12.5,
  populationDensity: 320.0,
};

describe("createRiskService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws IncompleteFeaturesError when required features are missing", async () => {
    const service = createRiskService("http://ml-service.local", 1000);
    const incomplete: WardFeatures = { ...completeFeatures, waterFraction: null };

    await expect(service.assessWard(incomplete)).rejects.toBeInstanceOf(IncompleteFeaturesError);
  });

  it("returns a parsed risk assessment on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ward_id: "ward-001",
        risk_score: 0.82,
        risk_label: "high",
        contributing_factors: { water_fraction: 0.5, rainfall_anomaly_mm: 0.3, population_density: 0.2 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = createRiskService("http://ml-service.local", 1000);
    const result = await service.assessWard(completeFeatures);

    expect(result.wardId).toBe("ward-001");
    expect(result.riskScore).toBe(0.82);
    expect(result.riskLabel).toBe("high");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ml-service.local/predict",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws MlServiceError when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    );

    const service = createRiskService("http://ml-service.local", 1000);

    await expect(service.assessWard(completeFeatures)).rejects.toBeInstanceOf(MlServiceError);
  });

  it("throws MlServiceError when fetch itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unreachable"))
    );

    const service = createRiskService("http://ml-service.local", 1000);

    await expect(service.assessWard(completeFeatures)).rejects.toBeInstanceOf(MlServiceError);
  });
});
