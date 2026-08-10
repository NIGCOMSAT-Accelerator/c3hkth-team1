import type { RiskService } from "../services/riskService.js";
import type { WardsRepository } from "../db/wardsRepository.js";

export interface RefreshWardRiskCacheDeps {
  wardsRepository: WardsRepository;
  riskService: RiskService;
}

export interface RefreshWardRiskCacheSummary {
  wardsChecked: number;
  wardsUpdated: number;
  wardsFailed: number;
}

export async function refreshWardRiskCache(deps: RefreshWardRiskCacheDeps): Promise<RefreshWardRiskCacheSummary> {
  const wards = await deps.wardsRepository.listWards({ role: "government", lgaId: null, wardId: null });

  let wardsUpdated = 0;
  let wardsFailed = 0;

  for (const ward of wards) {
    try {
      const features = await deps.wardsRepository.getLatestFeatures(ward.id);
      const assessment = await deps.riskService.assessWard(features);

      await deps.wardsRepository.updateCachedRisk(
        ward.id,
        assessment.riskScore,
        assessment.riskLabel,
        assessment.contributingFactors
      );

      wardsUpdated += 1;
    } catch (error) {
      wardsFailed += 1;
      console.error(`risk cache refresh failed for ward ${ward.id}:`, (error as Error).message);
    }
  }

  return { wardsChecked: wards.length, wardsUpdated, wardsFailed };
}
