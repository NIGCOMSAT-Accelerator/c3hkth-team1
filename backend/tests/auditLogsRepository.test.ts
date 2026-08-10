import { describe, expect, it, vi } from "vitest";

import { createAuditLogsRepository } from "../src/db/auditLogsRepository.js";
import type { DbPool } from "../src/db/pool.js";

function fakePool(queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>): DbPool {
  return { query: vi.fn(queryImpl) } as unknown as DbPool;
}

describe("auditLogsRepository.record", () => {
  it("inserts and returns the mapped entry", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "log-1",
          actor_id: "user-1",
          actor_email: "amaka@example.com",
          action: "profile.upserted",
          target_type: "user_profile",
          target_id: "user-1",
          metadata: { role: "ward_official" },
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createAuditLogsRepository(pool);

    const entry = await repository.record({
      actorId: "user-1",
      actorEmail: "amaka@example.com",
      action: "profile.upserted",
      targetType: "user_profile",
      targetId: "user-1",
      metadata: { role: "ward_official" },
    });

    expect(entry.id).toBe("log-1");
    expect(entry.metadata).toEqual({ role: "ward_official" });
  });

  it("defaults actorId, actorEmail, targetId, and metadata when omitted", async () => {
    const pool = fakePool(async (_sql, params) => {
      expect(params).toEqual([null, null, "alert.cron_triggered", "ward", null, "{}"]);
      return {
        rows: [
          {
            id: "log-1",
            actor_id: null,
            actor_email: null,
            action: "alert.cron_triggered",
            target_type: "ward",
            target_id: null,
            metadata: {},
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
    });
    const repository = createAuditLogsRepository(pool);

    const entry = await repository.record({ action: "alert.cron_triggered", targetType: "ward" });

    expect(entry.actorId).toBeNull();
  });

  it("throws when no row is returned", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAuditLogsRepository(pool);

    await expect(
      repository.record({ action: "test.action", targetType: "test" })
    ).rejects.toThrow(/no row returned/);
  });
});

describe("auditLogsRepository.listPaginated", () => {
  const sampleRow = {
    id: "log-1",
    actor_id: "user-1",
    actor_email: "amaka@example.com",
    action: "threshold.updated",
    target_type: "user_profile",
    target_id: "user-1",
    metadata: { alertThreshold: 0.5 },
    created_at: "2026-01-02T00:00:00.000Z",
  };

  it("queries without filters when none are given", async () => {
    let callIndex = 0;
    const pool = fakePool(async (sql, params) => {
      callIndex += 1;
      if (callIndex === 1) {
        expect(sql).not.toContain("where");
        expect(params).toEqual([]);
        return { rows: [{ count: "1" }] };
      }
      expect(sql).toContain("limit $1 offset $2");
      expect(params).toEqual([20, 0]);
      return { rows: [sampleRow] };
    });
    const repository = createAuditLogsRepository(pool);

    const result = await repository.listPaginated({}, 20, 0);

    expect(result.total).toBe(1);
    expect(result.logs).toHaveLength(1);
  });

  it("applies action and actorId filters with correctly indexed params", async () => {
    let callIndex = 0;
    const pool = fakePool(async (sql, params) => {
      callIndex += 1;
      if (callIndex === 1) {
        expect(sql).toContain("action = $1");
        expect(sql).toContain("actor_id = $2");
        expect(params).toEqual(["threshold.updated", "user-1"]);
        return { rows: [{ count: "2" }] };
      }
      expect(sql).toContain("limit $3 offset $4");
      expect(params).toEqual(["threshold.updated", "user-1", 10, 5]);
      return { rows: [sampleRow] };
    });
    const repository = createAuditLogsRepository(pool);

    const result = await repository.listPaginated(
      { action: "threshold.updated", actorId: "user-1" },
      10,
      5
    );

    expect(result.total).toBe(2);
    expect(result.logs[0]?.action).toBe("threshold.updated");
  });

  it("defaults total to zero when the count query returns no rows", async () => {
    let callIndex = 0;
    const pool = fakePool(async () => {
      callIndex += 1;
      return { rows: [] };
    });
    const repository = createAuditLogsRepository(pool);

    const result = await repository.listPaginated({}, 20, 0);

    expect(result.total).toBe(0);
  });
});
