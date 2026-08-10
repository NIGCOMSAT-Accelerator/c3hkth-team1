import type { DbPool } from "./pool.js";
import type { NewUserProfile, UserProfile } from "../types/domain.js";

export interface UserProfilesRepository {
  upsert(profile: NewUserProfile): Promise<UserProfile>;
  getById(id: string): Promise<UserProfile | null>;
  updateThreshold(id: string, alertThreshold: number | null): Promise<UserProfile>;
  resolveEffectiveThreshold(wardId: string, lgaId: string): Promise<number | null>;
}

interface UserProfileRow {
  id: string;
  full_name: string;
  role: UserProfile["role"];
  lga_id: string | null;
  ward_id: string | null;
  alert_threshold: number | null;
  phone_number: string | null;
  is_whatsapp_capable: boolean;
  created_at: string;
}

function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    lgaId: row.lga_id,
    wardId: row.ward_id,
    alertThreshold: row.alert_threshold,
    phoneNumber: row.phone_number,
    isWhatsappCapable: row.is_whatsapp_capable,
    createdAt: row.created_at,
  };
}

const PROFILE_COLUMNS =
  "id, full_name, role, lga_id, ward_id, alert_threshold, phone_number, is_whatsapp_capable, created_at";

export function createUserProfilesRepository(pool: DbPool): UserProfilesRepository {
  return {
    async upsert(profile: NewUserProfile) {
      const result = await pool.query<UserProfileRow>(
        `insert into user_profiles (id, full_name, role, lga_id, ward_id, phone_number, is_whatsapp_capable)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set
            full_name = excluded.full_name,
            role = excluded.role,
            lga_id = excluded.lga_id,
            ward_id = excluded.ward_id,
            phone_number = excluded.phone_number,
            is_whatsapp_capable = excluded.is_whatsapp_capable
         returning ${PROFILE_COLUMNS}`,
        [
          profile.id,
          profile.fullName,
          profile.role,
          profile.lgaId ?? null,
          profile.wardId ?? null,
          profile.phoneNumber ?? null,
          profile.isWhatsappCapable ?? true,
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error("failed to upsert user profile: no row returned");
      }

      return toUserProfile(row);
    },

    async getById(id: string) {
      const result = await pool.query<UserProfileRow>(
        `select ${PROFILE_COLUMNS} from user_profiles where id = $1`,
        [id]
      );

      const row = result.rows[0];
      return row ? toUserProfile(row) : null;
    },

    async updateThreshold(id: string, alertThreshold: number | null) {
      const result = await pool.query<UserProfileRow>(
        `update user_profiles
         set alert_threshold = $2
         where id = $1
         returning ${PROFILE_COLUMNS}`,
        [id, alertThreshold]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error(`failed to update threshold: no profile found for id ${id}`);
      }

      return toUserProfile(row);
    },

    async resolveEffectiveThreshold(wardId: string, lgaId: string) {
      const wardResult = await pool.query<{ alert_threshold: number | null }>(
        `select alert_threshold from user_profiles
         where role = 'ward_official' and ward_id = $1 and alert_threshold is not null
         limit 1`,
        [wardId]
      );
      if (wardResult.rows[0]) {
        return wardResult.rows[0].alert_threshold;
      }

      const lgaResult = await pool.query<{ alert_threshold: number | null }>(
        `select alert_threshold from user_profiles
         where role = 'lga_official' and lga_id = $1 and alert_threshold is not null
         limit 1`,
        [lgaId]
      );
      if (lgaResult.rows[0]) {
        return lgaResult.rows[0].alert_threshold;
      }

      return null;
    },
  };
}
