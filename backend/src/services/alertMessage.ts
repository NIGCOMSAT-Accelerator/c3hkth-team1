import type { RiskLabel } from "../types/domain.js";

export function buildAlertMessage(wardName: string, riskLabel: RiskLabel, riskScore: number): string {
  const scorePercent = Math.round(riskScore * 100);

  if (riskLabel === "high") {
    return `AquaWatch alert: ${wardName} is at HIGH malaria risk (${scorePercent}%). Standing water detected after recent rainfall. Prepare nets and larvicide now.`;
  }

  if (riskLabel === "moderate") {
    return `AquaWatch update: ${wardName} is at MODERATE malaria risk (${scorePercent}%). Monitor conditions and confirm supplies are ready.`;
  }

  return `AquaWatch update: ${wardName} is at LOW malaria risk (${scorePercent}%). No action needed at this time.`;
}
