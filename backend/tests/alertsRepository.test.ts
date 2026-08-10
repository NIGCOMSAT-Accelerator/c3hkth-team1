import { describe, expect, it, vi } from "vitest";

import { createAlertsRepository } from "../src/db/alertsRepository.js";
import type { DbPool } from "../src/db/pool.js";

function fakePool(queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>): DbPool {
  return { query: vi.fn(queryImpl) } as unknown as DbPool;
}

describe("alertsRepository.record", () => {
  it("inserts and returns the mapped alert", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "alert-1",
          ward_id: "ward-1",
          health_worker_id: "worker-1",
          channel: "sms",
          risk_score: 0.8,
          risk_label: "high",
          message: "AquaWatch alert",
          status: "sent",
          provider_message_id: "termii-123",
          error_message: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createAlertsRepository(pool);

    const alert = await repository.record({
      wardId: "ward-1",
      healthWorkerId: "worker-1",
      channel: "sms",
      riskScore: 0.8,
      riskLabel: "high",
      message: "AquaWatch alert",
      status: "sent",
      providerMessageId: "termii-123",
    });

    expect(alert.id).toBe("alert-1");
    expect(alert.status).toBe("sent");
  });

  it("throws when no row is returned from the insert", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    await expect(
      repository.record({
        wardId: "ward-1",
        healthWorkerId: "worker-1",
        channel: "sms",
        riskScore: 0.8,
        riskLabel: "high",
        message: "AquaWatch alert",
        status: "sent",
      })
    ).rejects.toThrow(/no row returned/);
  });
});

describe("alertsRepository.listByWard", () => {
  it("returns mapped alerts for the ward", async () => {
    const pool = fakePool(async () => ({
      rows: [
        {
          id: "alert-1",
          ward_id: "ward-1",
          health_worker_id: "worker-1",
          channel: "whatsapp",
          risk_score: 0.9,
          risk_label: "high",
          message: "AquaWatch alert",
          status: "failed",
          provider_message_id: null,
          error_message: "timeout",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));
    const repository = createAlertsRepository(pool);

    const alerts = await repository.listByWard("ward-1");

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.status).toBe("failed");
    expect(alerts[0]?.errorMessage).toBe("timeout");
  });
});

describe("alertsRepository.countByStatusForWards", () => {
  it("returns zero counts without querying when the ward list is empty", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    const counts = await repository.countByStatusForWards([]);

    expect(counts).toEqual({ sent: 0, failed: 0 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("maps grouped status counts correctly", async () => {
    const pool = fakePool(async () => ({
      rows: [
        { status: "sent", count: "12" },
        { status: "failed", count: "3" },
      ],
    }));
    const repository = createAlertsRepository(pool);

    const counts = await repository.countByStatusForWards(["ward-1", "ward-2"]);

    expect(counts).toEqual({ sent: 12, failed: 3 });
  });

  it("defaults a missing status to zero", async () => {
    const pool = fakePool(async () => ({ rows: [{ status: "sent", count: "5" }] }));
    const repository = createAlertsRepository(pool);

    const counts = await repository.countByStatusForWards(["ward-1"]);

    expect(counts).toEqual({ sent: 5, failed: 0 });
  });
});

describe("alertsRepository.getAnalyticsForWards", () => {
  it("returns zero'd structures without querying when the ward list is empty", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    const analytics = await repository.getAnalyticsForWards([], 7);

    expect(analytics.byChannel).toEqual({
      sms: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
      email: { sent: 0, failed: 0 },
    });
    expect(analytics.byDay).toHaveLength(7);
    expect(analytics.byDay.every((day) => day.sent === 0 && day.failed === 0)).toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("builds a full day range and merges in real counts by date", async () => {
    const today = new Date().toISOString().slice(0, 10);

    let callCount = 0;
    const pool = fakePool(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { rows: [{ channel: "sms", status: "sent", count: "4" }] };
      }
      return { rows: [{ day: today, status: "sent", count: "4" }] };
    });
    const repository = createAlertsRepository(pool);

    const analytics = await repository.getAnalyticsForWards(["ward-1"], 3);

    expect(analytics.byDay).toHaveLength(3);
    expect(analytics.byChannel.sms.sent).toBe(4);
    const todayEntry = analytics.byDay.find((day) => day.date === today);
    expect(todayEntry?.sent).toBe(4);
  });

  it("defaults missing channels and statuses to zero", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    const analytics = await repository.getAnalyticsForWards(["ward-1"], 5);

    expect(analytics.byChannel.whatsapp).toEqual({ sent: 0, failed: 0 });
    expect(analytics.byDay).toHaveLength(5);
  });
});

describe("alertsRepository.listRecentForWards", () => {
  it("returns an empty array without querying when the ward list is empty", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    const alerts = await repository.listRecentForWards([], 10);

    expect(alerts).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("returns mapped alerts ordered by the query, respecting the limit param", async () => {
    const pool = fakePool(async (_sql, params) => {
      expect(params).toEqual([["ward-1", "ward-2"], 5]);
      return {
        rows: [
          {
            id: "alert-1",
            ward_id: "ward-1",
            health_worker_id: "worker-1",
            channel: "sms",
            risk_score: 0.8,
            risk_label: "high",
            message: "AquaWatch alert",
            status: "sent",
            provider_message_id: "termii-1",
            error_message: null,
            created_at: "2026-01-02T00:00:00.000Z",
          },
        ],
      };
    });
    const repository = createAlertsRepository(pool);

    const alerts = await repository.listRecentForWards(["ward-1", "ward-2"], 5);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.id).toBe("alert-1");
  });
});

describe("alertsRepository.listPaginatedForWards", () => {
  const sampleRow = {
    id: "alert-1",
    ward_id: "ward-1",
    health_worker_id: "worker-1",
    channel: "sms",
    risk_score: 0.8,
    risk_label: "high",
    message: "AquaWatch alert",
    status: "sent",
    provider_message_id: "termii-1",
    error_message: null,
    created_at: "2026-01-02T00:00:00.000Z",
  };

  it("returns empty results without querying when the ward list is empty", async () => {
    const pool = fakePool(async () => ({ rows: [] }));
    const repository = createAlertsRepository(pool);

    const result = await repository.listPaginatedForWards([], {}, 20, 0);

    expect(result).toEqual({ alerts: [], total: 0 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("queries with only the ward-scope filter when no other filters are given", async () => {
    let callIndex = 0;
    const pool = fakePool(async (sql, params) => {
      callIndex += 1;
      if (callIndex === 1) {
        expect(sql).toContain("where ward_id = any($1)");
        expect(params).toEqual([["ward-1"]]);
        return { rows: [{ count: "1" }] };
      }
      expect(params).toEqual([["ward-1"], 20, 0]);
      expect(sql).toContain("limit $2 offset $3");
      return { rows: [sampleRow] };
    });
    const repository = createAlertsRepository(pool);

    const result = await repository.listPaginatedForWards(["ward-1"], {}, 20, 0);

    expect(result.total).toBe(1);
    expect(result.alerts).toHaveLength(1);
  });

  it("applies channel, status, and wardId filters with correctly indexed params", async () => {
    let callIndex = 0;
    const pool = fakePool(async (sql, params) => {
      callIndex += 1;
      if (callIndex === 1) {
        expect(sql).toContain("channel = $2");
        expect(sql).toContain("status = $3");
        expect(sql).toContain("ward_id = $4");
        expect(params).toEqual([["ward-1", "ward-2"], "sms", "sent", "ward-1"]);
        return { rows: [{ count: "3" }] };
      }
      expect(sql).toContain("limit $5 offset $6");
      expect(params).toEqual([["ward-1", "ward-2"], "sms", "sent", "ward-1", 10, 20]);
      return { rows: [sampleRow] };
    });
    const repository = createAlertsRepository(pool);

    const result = await repository.listPaginatedForWards(
      ["ward-1", "ward-2"],
      { channel: "sms", status: "sent", wardId: "ward-1" },
      10,
      20
    );

    expect(result.total).toBe(3);
    expect(result.alerts[0]?.channel).toBe("sms");
  });

  it("defaults total to zero when the count query returns no rows", async () => {
    let callIndex = 0;
    const pool = fakePool(async () => {
      callIndex += 1;
      if (callIndex === 1) return { rows: [] };
      return { rows: [] };
    });
    const repository = createAlertsRepository(pool);

    const result = await repository.listPaginatedForWards(["ward-1"], {}, 20, 0);

    expect(result.total).toBe(0);
  });
});
