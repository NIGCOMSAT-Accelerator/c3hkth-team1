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

async function refreshOneWard(wardId: string, deps: RefreshWardRiskCacheDeps): Promise<boolean> {
  try {
    const features = await deps.wardsRepository.getLatestFeatures(wardId);
    const assessment = await deps.riskService.assessWard(features);

    await deps.wardsRepository.updateCachedRisk(
      wardId,
      assessment.riskScore,
      assessment.riskLabel,
      assessment.contributingFactors
    );

    return true;
  } catch (error) {
    console.error(`risk cache refresh failed for ward ${wardId}:`, (error as Error).message);
    return false;
  }
}

/**
 * Refreshes every ward in the system. Intended for the cron job, where a long-running
 * single call is fine. Not intended to be called from a request a browser is waiting on -
 * use refreshWardsRiskByIds in small batches from the frontend instead.
 */
export async function refreshWardRiskCache(deps: RefreshWardRiskCacheDeps): Promise<RefreshWardRiskCacheSummary> {
  const wards = await deps.wardsRepository.listWards({ role: "government", lgaId: null, wardId: null });

  let wardsUpdated = 0;
  let wardsFailed = 0;

  for (const ward of wards) {
    const success = await refreshOneWard(ward.id, deps);
    if (success) {
      wardsUpdated += 1;
    } else {
      wardsFailed += 1;
    }
  }

  return { wardsChecked: wards.length, wardsUpdated, wardsFailed };
}

/**
 * Refreshes only the given ward ids. Designed to be called repeatedly with small batches
 * (e.g. 25 wards) so each request completes quickly and the caller can show real progress.
 */
export async function refreshWardsRiskByIds(
  wardIds: string[],
  deps: RefreshWardRiskCacheDeps
): Promise<RefreshWardRiskCacheSummary> {
  let wardsUpdated = 0;
  let wardsFailed = 0;

  for (const wardId of wardIds) {
    const success = await refreshOneWard(wardId, deps);
    if (success) {
      wardsUpdated += 1;
    } else {
      wardsFailed += 1;
    }
  }

  return { wardsChecked: wardIds.length, wardsUpdated, wardsFailed };
}
