import { describe, expect, it, vi } from "vitest";

import { canAccessWard, createWardsRepository, type WardAccessScope } from "../src/db/wardsRepository.js";
import type { DbPool } from "../src/db/pool.js";
import type { Ward } from "../src/types/domain.js";

const ward: Ward = { id: "ward-1", name: "Adankolo", lgaId: "lga-1", lgaName: "Lokoja", state: "Kogi" };

describe("canAccessWard", () => {
  it("allows government to access any ward", () => {
    const scope: WardAccessScope = { role: "government", lgaId: null, wardId: null };
    expect(canAccessWard(scope, ward)).toBe(true);
  });

  it("allows an lga_official to access a ward in their lga", () => {
    const scope: WardAccessScope = { role: "lga_official", lgaId: "lga-1", wardId: null };
    expect(canAccessWard(scope, ward)).toBe(true);
  });

  it("denies an lga_official access to a ward outside their lga", () => {
    const scope: WardAccessScope = { role: "lga_official", lgaId: "lga-2", wardId: null };
    expect(canAccessWard(scope, ward)).toBe(false);
  });

  it("allows a ward_official to access their own ward", () => {
    const scope: WardAccessScope = { role: "ward_official", lgaId: null, wardId: "ward-1" };
    expect(canAccessWard(scope, ward)).toBe(true);
  });

  it("denies a ward_official access to a different ward", () => {
    const scope: WardAccessScope = { role: "ward_official", lgaId: null, wardId: "ward-2" };
    expect(canAccessWard(scope, ward)).toBe(false);
  });
});

describe("wardsRepository.listWards scoping", () => {
  function fakePool(rows: unknown[]): DbPool {
    return { query: vi.fn(async () => ({ rows })) } as unknown as DbPool;
  }

  it("queries without a where clause for government", async () => {
    const pool = fakePool([{ id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" }]);
    const repository = createWardsRepository(pool);

    const wards = await repository.listWards({ role: "government", lgaId: null, wardId: null });

    expect(wards).toHaveLength(1);
    const [sql] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).not.toContain("where");
  });

  it("filters by lga_id for lga_official", async () => {
    const pool = fakePool([{ id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" }]);
    const repository = createWardsRepository(pool);

    await repository.listWards({ role: "lga_official", lgaId: "lga-1", wardId: null });

    const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).toContain("w.lga_id = $1");
    expect(params).toEqual(["lga-1"]);
  });

  it("filters by ward id for ward_official", async () => {
    const pool = fakePool([{ id: "ward-1", name: "Adankolo", lga_id: "lga-1", lga_name: "Lokoja", state: "Kogi" }]);
    const repository = createWardsRepository(pool);

    await repository.listWards({ role: "ward_official", lgaId: null, wardId: "ward-1" });

    const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).toContain("w.id = $1");
    expect(params).toEqual(["ward-1"]);
  });
});
