import type { DbPool } from "../db/pool.js";
import type { AppUserRole, RiskLabel, Ward, WardFeatures } from "../types/domain.js";

export interface WardAccessScope {
  role: AppUserRole;
  lgaId: string | null;
  wardId: string | null;
}

export interface WardsRepository {
  listWards(scope: WardAccessScope): Promise<Ward[]>;
  getWardById(wardId: string): Promise<Ward | null>;
  getLatestFeatures(wardId: string): Promise<WardFeatures>;
  updateCachedRisk(
    wardId: string,
    riskScore: number,
    riskLabel: RiskLabel,
    contributingFactors: Record<string, number>
  ): Promise<void>;
}

interface WardRow {
  id: string;
  name: string;
  lga_id: string;
  lga_name: string;
  state: string;
  satellite_image_url?: string | null;
  satellite_image_updated_at?: string | null;
  cached_risk_score?: number | null;
  cached_risk_label?: RiskLabel | null;
  cached_contributing_factors?: Record<string, number> | null;
  cached_risk_updated_at?: string | null;
}

const WARD_COLUMNS = `
  w.id, w.name, l.id as lga_id, l.name as lga_name, l.state,
  w.satellite_image_url, w.satellite_image_updated_at,
  w.cached_risk_score, w.cached_risk_label, w.cached_contributing_factors, w.cached_risk_updated_at
`;

export function createWardsRepository(pool: DbPool): WardsRepository {
  return {
    async listWards(scope: WardAccessScope) {
      const baseQuery = `
         select ${WARD_COLUMNS}
         from wards w
         join lgas l on l.id = w.lga_id
      `;

      if (scope.role === "government") {
        const result = await pool.query<WardRow>(`${baseQuery} order by l.state, l.name, w.name`);
        return result.rows.map(mapWardRow);
      }

      if (scope.role === "lga_official") {
        const result = await pool.query<WardRow>(`${baseQuery} where w.lga_id = $1 order by w.name`, [
          scope.lgaId,
        ]);
        return result.rows.map(mapWardRow);
      }

      const result = await pool.query<WardRow>(`${baseQuery} where w.id = $1`, [scope.wardId]);
      return result.rows.map(mapWardRow);
    },

    async getWardById(wardId: string) {
      const result = await pool.query<WardRow>(
        `select ${WARD_COLUMNS}
         from wards w
         join lgas l on l.id = w.lga_id
         where w.id = $1`,
        [wardId]
      );

      const row = result.rows[0];
      return row ? mapWardRow(row) : null;
    },

    async getLatestFeatures(wardId: string) {
      const result = await pool.query<{ metric_name: string; metric_value: number }>(
        `select distinct on (metric_name) metric_name, metric_value
         from environmental_observations
         where ward_id = $1
         order by metric_name, observed_on desc`,
        [wardId]
      );

      const byMetric = new Map(result.rows.map((row) => [row.metric_name, row.metric_value]));

      return {
        wardId,
        waterFraction: byMetric.get("water_fraction") ?? null,
        rainfallAnomalyMm: byMetric.get("rainfall_anomaly_mm") ?? null,
        populationDensity: byMetric.get("population_density") ?? null,
      } satisfies WardFeatures;
    },

    async updateCachedRisk(
      wardId: string,
      riskScore: number,
      riskLabel: RiskLabel,
      contributingFactors: Record<string, number>
    ) {
      await pool.query(
        `update wards
         set cached_risk_score = $2,
             cached_risk_label = $3,
             cached_contributing_factors = $4,
             cached_risk_updated_at = now()
         where id = $1`,
        [wardId, riskScore, riskLabel, JSON.stringify(contributingFactors)]
      );
    },
  };
}

function mapWardRow(row: WardRow): Ward {
  return {
    id: row.id,
    name: row.name,
    lgaId: row.lga_id,
    lgaName: row.lga_name,
    state: row.state,
    satelliteImageUrl: row.satellite_image_url ?? null,
    satelliteImageUpdatedAt: row.satellite_image_updated_at ?? null,
    cachedRiskScore: row.cached_risk_score ?? null,
    cachedRiskLabel: row.cached_risk_label ?? null,
    cachedContributingFactors: row.cached_contributing_factors ?? null,
    cachedRiskUpdatedAt: row.cached_risk_updated_at ?? null,
  };
}

export function canAccessWard(scope: WardAccessScope, ward: Ward): boolean {
  if (scope.role === "government") return true;
  if (scope.role === "lga_official") return scope.lgaId === ward.lgaId;
  return scope.wardId === ward.id;
}
