import type { DbPool } from "./pool.js";
import type { AuditLogEntry, NewAuditLogEntry } from "../types/domain.js";

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
}

export interface AuditLogsRepository {
  record(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
  listPaginated(filters: AuditLogFilters, limit: number, offset: number): Promise<PaginatedAuditLogs>;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function createAuditLogsRepository(pool: DbPool): AuditLogsRepository {
  return {
    async record(entry: NewAuditLogEntry) {
      const result = await pool.query<AuditLogRow>(
        `insert into audit_logs (actor_id, actor_email, action, target_type, target_id, metadata)
         values ($1, $2, $3, $4, $5, $6)
         returning id, actor_id, actor_email, action, target_type, target_id, metadata, created_at`,
        [
          entry.actorId ?? null,
          entry.actorEmail ?? null,
          entry.action,
          entry.targetType,
          entry.targetId ?? null,
          JSON.stringify(entry.metadata ?? {}),
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error("failed to record audit log entry: no row returned");
      }

      return toAuditLogEntry(row);
    },

    async listPaginated(filters: AuditLogFilters, limit: number, offset: number) {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.action) {
        params.push(filters.action);
        conditions.push(`action = $${params.length}`);
      }
      if (filters.actorId) {
        params.push(filters.actorId);
        conditions.push(`actor_id = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

      const countResult = await pool.query<{ count: string }>(
        `select count(*) as count from audit_logs ${whereClause}`,
        params
      );
      const total = Number(countResult.rows[0]?.count ?? 0);

      const queryParams = [...params, limit, offset];
      const limitIndex = queryParams.length - 1;
      const offsetIndex = queryParams.length;

      const result = await pool.query<AuditLogRow>(
        `select id, actor_id, actor_email, action, target_type, target_id, metadata, created_at
         from audit_logs
         ${whereClause}
         order by created_at desc
         limit $${limitIndex} offset $${offsetIndex}`,
        queryParams
      );

      return { logs: result.rows.map(toAuditLogEntry), total };
    },
  };
}
