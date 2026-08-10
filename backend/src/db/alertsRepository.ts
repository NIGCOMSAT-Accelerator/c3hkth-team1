import type { DbPool } from "./pool.js";
import type { Alert, NewAlert } from "../types/domain.js";

export interface AlertStatusCounts {
  sent: number;
  failed: number;
}

export interface AlertsByDay {
  date: string;
  sent: number;
  failed: number;
}

export interface AlertAnalytics {
  byChannel: Record<Alert["channel"], AlertStatusCounts>;
  byDay: AlertsByDay[];
}

export interface AlertListFilters {
  channel?: Alert["channel"];
  status?: Alert["status"];
  wardId?: string;
}

export interface PaginatedAlerts {
  alerts: Alert[];
  total: number;
}

export interface AlertsRepository {
  record(alert: NewAlert): Promise<Alert>;
  listByWard(wardId: string): Promise<Alert[]>;
  countByStatusForWards(wardIds: string[]): Promise<AlertStatusCounts>;
  getAnalyticsForWards(wardIds: string[], days: number): Promise<AlertAnalytics>;
  listRecentForWards(wardIds: string[], limit: number): Promise<Alert[]>;
  listPaginatedForWards(
    wardIds: string[],
    filters: AlertListFilters,
    limit: number,
    offset: number
  ): Promise<PaginatedAlerts>;
}

interface AlertRow {
  id: string;
  ward_id: string;
  health_worker_id: string;
  channel: Alert["channel"];
  risk_score: number;
  risk_label: Alert["riskLabel"];
  message: string;
  status: Alert["status"];
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    wardId: row.ward_id,
    healthWorkerId: row.health_worker_id,
    channel: row.channel,
    riskScore: row.risk_score,
    riskLabel: row.risk_label,
    message: row.message,
    status: row.status,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export function createAlertsRepository(pool: DbPool): AlertsRepository {
  return {
    async record(alert: NewAlert) {
      const result = await pool.query<AlertRow>(
        `insert into alerts
           (ward_id, health_worker_id, channel, risk_score, risk_label, message, status, provider_message_id, error_message)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id, ward_id, health_worker_id, channel, risk_score, risk_label, message, status,
                   provider_message_id, error_message, created_at`,
        [
          alert.wardId,
          alert.healthWorkerId,
          alert.channel,
          alert.riskScore,
          alert.riskLabel,
          alert.message,
          alert.status,
          alert.providerMessageId ?? null,
          alert.errorMessage ?? null,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error("failed to record alert: no row returned");
      }

      return toAlert(row);
    },

    async listByWard(wardId: string) {
      const result = await pool.query<AlertRow>(
        `select id, ward_id, health_worker_id, channel, risk_score, risk_label, message, status,
                provider_message_id, error_message, created_at
         from alerts
         where ward_id = $1
         order by created_at desc`,
        [wardId]
      );

      return result.rows.map(toAlert);
    },

    async countByStatusForWards(wardIds: string[]) {
      if (wardIds.length === 0) {
        return { sent: 0, failed: 0 };
      }

      const result = await pool.query<{ status: Alert["status"]; count: string }>(
        `select status, count(*) as count
         from alerts
         where ward_id = any($1)
         group by status`,
        [wardIds]
      );

      const counts: AlertStatusCounts = { sent: 0, failed: 0 };
      for (const row of result.rows) {
        counts[row.status] = Number(row.count);
      }

      return counts;
    },

    async getAnalyticsForWards(wardIds: string[], days: number) {
      const dayRange = buildEmptyDayRange(days);

      if (wardIds.length === 0) {
        return {
          byChannel: {
            sms: { sent: 0, failed: 0 },
            whatsapp: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 },
          },
          byDay: dayRange,
        };
      }

      const channelResult = await pool.query<{
        channel: Alert["channel"];
        status: Alert["status"];
        count: string;
      }>(
        `select channel, status, count(*) as count
         from alerts
         where ward_id = any($1) and created_at >= now() - ($2 || ' days')::interval
         group by channel, status`,
        [wardIds, days]
      );

      const byChannel: Record<Alert["channel"], AlertStatusCounts> = {
        sms: { sent: 0, failed: 0 },
        whatsapp: { sent: 0, failed: 0 },
        email: { sent: 0, failed: 0 },
      };
      for (const row of channelResult.rows) {
        byChannel[row.channel][row.status] = Number(row.count);
      }

      const dayResult = await pool.query<{ day: string; status: Alert["status"]; count: string }>(
        `select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, status, count(*) as count
         from alerts
         where ward_id = any($1) and created_at >= now() - ($2 || ' days')::interval
         group by day, status
         order by day`,
        [wardIds, days]
      );

      const byDayMap = new Map(dayRange.map((entry) => [entry.date, entry]));
      for (const row of dayResult.rows) {
        const entry = byDayMap.get(row.day);
        if (entry) {
          entry[row.status] = Number(row.count);
        }
      }

      return { byChannel, byDay: Array.from(byDayMap.values()) };
    },

    async listRecentForWards(wardIds: string[], limit: number) {
      if (wardIds.length === 0) {
        return [];
      }

      const result = await pool.query<AlertRow>(
        `select id, ward_id, health_worker_id, channel, risk_score, risk_label, message, status,
                provider_message_id, error_message, created_at
         from alerts
         where ward_id = any($1)
         order by created_at desc
         limit $2`,
        [wardIds, limit]
      );

      return result.rows.map(toAlert);
    },

    async listPaginatedForWards(
      wardIds: string[],
      filters: AlertListFilters,
      limit: number,
      offset: number
    ) {
      if (wardIds.length === 0) {
        return { alerts: [], total: 0 };
      }

      const conditions: string[] = ["ward_id = any($1)"];
      const params: unknown[] = [wardIds];

      if (filters.channel) {
        params.push(filters.channel);
        conditions.push(`channel = $${params.length}`);
      }
      if (filters.status) {
        params.push(filters.status);
        conditions.push(`status = $${params.length}`);
      }
      if (filters.wardId) {
        params.push(filters.wardId);
        conditions.push(`ward_id = $${params.length}`);
      }

      const whereClause = conditions.join(" and ");

      const countResult = await pool.query<{ count: string }>(
        `select count(*) as count from alerts where ${whereClause}`,
        params
      );
      const total = Number(countResult.rows[0]?.count ?? 0);

      const queryParams = [...params, limit, offset];
      const limitIndex = queryParams.length - 1;
      const offsetIndex = queryParams.length;

      const result = await pool.query<AlertRow>(
        `select id, ward_id, health_worker_id, channel, risk_score, risk_label, message, status,
                provider_message_id, error_message, created_at
         from alerts
         where ${whereClause}
         order by created_at desc
         limit $${limitIndex} offset $${offsetIndex}`,
        queryParams
      );

      return { alerts: result.rows.map(toAlert), total };
    },
  };
}

function buildEmptyDayRange(days: number): AlertsByDay[] {
  const result: AlertsByDay[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    result.push({ date: day.toISOString().slice(0, 10), sent: 0, failed: 0 });
  }

  return result;
}
