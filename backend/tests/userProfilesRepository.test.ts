import { describe, expect, it, vi } from "vitest";

import { createUserProfilesRepository } from "../src/db/userProfilesRepository.js";
import type { DbPool } from "../src/db/pool.js";

function fakePool(queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>): DbPool {
  return { query: vi.fn(queryImpl) } as unknown as DbPool;
}

describe("userProfilesRepository.upsert", () => {
  it("inserts and returns the mapped profile", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "user-1",
          full_name: "Amaka Obi",
          role: "government",
          lga_id: null,
          ward_id: null,
          alert_threshold: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createUserProfilesRepository(pool);

    const profile = await repository.upsert({ id: "user-1", fullName: "Amaka Obi", role: "government" });

    expect(profile.id).toBe("user-1");
    expect(profile.role).toBe("government");
  });

  it("maps phone number and whatsapp capability through correctly", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "user-1",
          full_name: "Amaka Obi",
          role: "ward_official",
          lga_id: null,
          ward_id: "ward-1",
          alert_threshold: null,
          phone_number: "+2348012345678",
          is_whatsapp_capable: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createUserProfilesRepository(pool);

    const profile = await repository.upsert({
      id: "user-1",
      fullName: "Amaka Obi",
      role: "ward_official",
      wardId: "ward-1",
      phoneNumber: "+2348012345678",
      isWhatsappCapable: false,
    });

    expect(profile.phoneNumber).toBe("+2348012345678");
    expect(profile.isWhatsappCapable).toBe(false);
  });

  it("throws when no row is returned", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createUserProfilesRepository(pool);

    await expect(
      repository.upsert({ id: "user-1", fullName: "Amaka Obi", role: "government" })
    ).rejects.toThrow(/no row returned/);
  });
});

describe("userProfilesRepository.getById", () => {
  it("returns null when no profile exists", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createUserProfilesRepository(pool);

    const profile = await repository.getById("missing-user");

    expect(profile).toBeNull();
  });

  it("returns the mapped profile when found", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "user-1",
          full_name: "Amaka Obi",
          role: "ward_official",
          lga_id: null,
          ward_id: "ward-1",
          alert_threshold: 0.5,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createUserProfilesRepository(pool);

    const profile = await repository.getById("user-1");

    expect(profile?.wardId).toBe("ward-1");
    expect(profile?.alertThreshold).toBe(0.5);
  });
});

describe("userProfilesRepository.updateThreshold", () => {
  it("updates and returns the mapped profile with the new threshold", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "user-1",
          full_name: "Amaka Obi",
          role: "ward_official",
          lga_id: null,
          ward_id: "ward-1",
          alert_threshold: 0.4,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createUserProfilesRepository(pool);

    const profile = await repository.updateThreshold("user-1", 0.4);

    expect(profile.alertThreshold).toBe(0.4);
  });

  it("throws when no profile exists for the id", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createUserProfilesRepository(pool);

    await expect(repository.updateThreshold("missing-user", 0.5)).rejects.toThrow(/no profile found/);
  });
});

describe("userProfilesRepository.resolveEffectiveThreshold", () => {
  it("returns the ward_official's threshold when one is set", async () => {
    const pool = fakePool(async (sql) => {
      if (sql.includes("ward_official")) {
        return { rows: [{ alert_threshold: 0.35 }] };
      }
      return { rows: [] };
    });
    const repository = createUserProfilesRepository(pool);

    const threshold = await repository.resolveEffectiveThreshold("ward-1", "lga-1");

    expect(threshold).toBe(0.35);
  });

  it("falls back to the lga_official's threshold when no ward override exists", async () => {
    const pool = fakePool(async (sql) => {
      if (sql.includes("ward_official")) {
        return { rows: [] };
      }
      if (sql.includes("lga_official")) {
        return { rows: [{ alert_threshold: 0.5 }] };
      }
      return { rows: [] };
    });
    const repository = createUserProfilesRepository(pool);

    const threshold = await repository.resolveEffectiveThreshold("ward-1", "lga-1");

    expect(threshold).toBe(0.5);
  });

  it("returns null when neither ward nor lga has an override", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createUserProfilesRepository(pool);

    const threshold = await repository.resolveEffectiveThreshold("ward-1", "lga-1");

    expect(threshold).toBeNull();
  });
});
