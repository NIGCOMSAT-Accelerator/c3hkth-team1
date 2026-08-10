import { describe, expect, it, vi } from "vitest";

import { createHealthWorkersRepository } from "../src/db/healthWorkersRepository.js";
import type { DbPool } from "../src/db/pool.js";

function fakePool(queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>): DbPool {
  return { query: vi.fn(queryImpl) } as unknown as DbPool;
}

describe("healthWorkersRepository.register", () => {
  it("inserts and returns the mapped health worker", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "worker-1",
          ward_id: "ward-1",
          full_name: "Amaka Obi",
          role: "chew",
          phone_number: "+2348012345678",
          email: "amaka@example.com",
          whatsapp_capable: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createHealthWorkersRepository(pool);

    const worker = await repository.register({
      wardId: "ward-1",
      fullName: "Amaka Obi",
      role: "chew",
      phoneNumber: "+2348012345678",
      email: "amaka@example.com",
      whatsappCapable: true,
    });

    expect(worker.id).toBe("worker-1");
    expect(worker.fullName).toBe("Amaka Obi");
    expect(worker.whatsappCapable).toBe(true);
  });

  it("passes whatsappCapable=true to the insert by default when omitted", async () => {
    const pool = fakePool(async (_sql, params) => {
      expect(params?.[5]).toBe(true);
      return {
        rows: [
          {
            id: "worker-1",
            ward_id: "ward-1",
            full_name: "Amaka Obi",
            role: "chew",
            phone_number: "+2348012345678",
            email: null,
            whatsapp_capable: true,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    });
    const repository = createHealthWorkersRepository(pool);

    await repository.register({
      wardId: "ward-1",
      fullName: "Amaka Obi",
      role: "chew",
      phoneNumber: "+2348012345678",
    });
  });

  it("passes whatsappCapable=false through to the insert when explicitly set", async () => {
    const pool = fakePool(async (_sql, params) => {
      expect(params?.[5]).toBe(false);
      return {
        rows: [
          {
            id: "worker-1",
            ward_id: "ward-1",
            full_name: "Amaka Obi",
            role: "chew",
            phone_number: "+2348012345678",
            email: null,
            whatsapp_capable: false,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    });
    const repository = createHealthWorkersRepository(pool);

    const worker = await repository.register({
      wardId: "ward-1",
      fullName: "Amaka Obi",
      role: "chew",
      phoneNumber: "+2348012345678",
      whatsappCapable: false,
    });

    expect(worker.whatsappCapable).toBe(false);
  });

  it("throws when no row is returned from the insert", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createHealthWorkersRepository(pool);

    await expect(
      repository.register({
        wardId: "ward-1",
        fullName: "Amaka Obi",
        role: "chew",
        phoneNumber: "+2348012345678",
      })
    ).rejects.toThrow(/no row returned/);
  });
});

describe("healthWorkersRepository.listByWard", () => {
  it("returns mapped workers for the ward", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "worker-1",
          ward_id: "ward-1",
          full_name: "Amaka Obi",
          role: "chew",
          phone_number: "+2348012345678",
          email: null,
          whatsapp_capable: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createHealthWorkersRepository(pool);

    const workers = await repository.listByWard("ward-1");

    expect(workers).toHaveLength(1);
    expect(workers[0]?.email).toBeNull();
    expect(workers[0]?.whatsappCapable).toBe(false);
  });
});
