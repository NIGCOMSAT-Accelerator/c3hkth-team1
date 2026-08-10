import type { RiskAssessment, WardFeatures } from "../types/domain.js";

export class MlServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "MlServiceError";
  }
}

export class IncompleteFeaturesError extends Error {
  constructor(readonly missingFields: string[]) {
    super(`ward is missing required features: ${missingFields.join(", ")}`);
    this.name = "IncompleteFeaturesError";
  }
}

export interface RiskService {
  assessWard(features: WardFeatures): Promise<RiskAssessment>;
}

interface MlPredictResponse {
  ward_id: string;
  risk_score: number;
  risk_label: RiskAssessment["riskLabel"];
  contributing_factors: Record<string, number>;
}

function assertCompleteFeatures(features: WardFeatures): asserts features is WardFeatures & {
  waterFraction: number;
  rainfallAnomalyMm: number;
  populationDensity: number;
} {
  const missing: string[] = [];
  if (features.waterFraction === null) missing.push("waterFraction");
  if (features.rainfallAnomalyMm === null) missing.push("rainfallAnomalyMm");
  if (features.populationDensity === null) missing.push("populationDensity");

  if (missing.length > 0) {
    throw new IncompleteFeaturesError(missing);
  }
}

export function createRiskService(baseUrl: string, timeoutMs: number): RiskService {
  return {
    async assessWard(features: WardFeatures) {
      assertCompleteFeatures(features);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ward_id: features.wardId,
            water_fraction: features.waterFraction,
            rainfall_anomaly_mm: features.rainfallAnomalyMm,
            population_density: features.populationDensity,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        throw new MlServiceError(`failed to reach ml-service: ${(error as Error).message}`);
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new MlServiceError(`ml-service returned an error status`, response.status);
      }

      const body = (await response.json()) as MlPredictResponse;

      return {
        wardId: body.ward_id,
        riskScore: body.risk_score,
        riskLabel: body.risk_label,
        contributingFactors: body.contributing_factors,
      } satisfies RiskAssessment;
    },
  };
}
