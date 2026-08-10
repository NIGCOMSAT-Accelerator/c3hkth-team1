import type { DbPool } from "../db/pool.js";
import type { HealthWorker, NewHealthWorker } from "../types/domain.js";

export interface HealthWorkersRepository {
  register(input: NewHealthWorker): Promise<HealthWorker>;
  listByWard(wardId: string): Promise<HealthWorker[]>;
}

interface HealthWorkerRow {
  id: string;
  ward_id: string;
  full_name: string;
  role: HealthWorker["role"];
  phone_number: string;
  email: string | null;
  whatsapp_capable: boolean;
  created_at: string;
}

function toHealthWorker(row: HealthWorkerRow): HealthWorker {
  return {
    id: row.id,
    wardId: row.ward_id,
    fullName: row.full_name,
    role: row.role,
    phoneNumber: row.phone_number,
    email: row.email,
    whatsappCapable: row.whatsapp_capable,
    createdAt: row.created_at,
  };
}

export function createHealthWorkersRepository(pool: DbPool): HealthWorkersRepository {
  return {
    async register(input: NewHealthWorker) {
      const result = await pool.query<HealthWorkerRow>(
        `insert into health_workers (ward_id, full_name, role, phone_number, email, whatsapp_capable)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (ward_id, phone_number)
         do update set
            full_name = excluded.full_name,
            role = excluded.role,
            email = excluded.email,
            whatsapp_capable = excluded.whatsapp_capable
         returning id, ward_id, full_name, role, phone_number, email, whatsapp_capable, created_at`,
        [
          input.wardId,
          input.fullName,
          input.role,
          input.phoneNumber,
          input.email ?? null,
          input.whatsappCapable ?? true,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error("failed to register health worker: no row returned");
      }

      return toHealthWorker(row);
    },

    async listByWard(wardId: string) {
      const result = await pool.query<HealthWorkerRow>(
        `select id, ward_id, full_name, role, phone_number, email, whatsapp_capable, created_at
         from health_workers
         where ward_id = $1
         order by created_at desc`,
        [wardId]
      );

      return result.rows.map(toHealthWorker);
    },
  };
}
