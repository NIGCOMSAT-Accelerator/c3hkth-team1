"use client";

import { useMemo, useState } from "react";

import { RiskPill, type RiskLevel } from "@/components/RiskPill";
import { SatelliteImageModal } from "@/components/SatelliteImageModal";
import { TriggerAlertButton } from "@/components/TriggerAlertButton";
import type { WardRiskAssessment, WardSummary } from "@/lib/api";

export interface WardTableRow {
  ward: WardSummary;
  risk: WardRiskAssessment | null;
}

type SortKey = "name" | "lgaName" | "state" | "riskScore";
type SortDirection = "asc" | "desc";
type RiskFilter = "all" | RiskLevel | "pending";

const PAGE_SIZE = 10;

function riskFilterMatches(row: WardTableRow, filter: RiskFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return row.risk === null;
  return row.risk?.riskLabel === filter;
}

export function WardTable({ rows }: { rows: WardTableRow[] }) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const matchesSearch =
        query === "" ||
        row.ward.name.toLowerCase().includes(query) ||
        row.ward.lgaName.toLowerCase().includes(query) ||
        row.ward.state.toLowerCase().includes(query);

      return matchesSearch && riskFilterMatches(row, riskFilter);
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "riskScore") {
        const aScore = a.risk?.riskScore ?? -1;
        const bScore = b.risk?.riskScore ?? -1;
        comparison = aScore - bScore;
      } else {
        const aValue = sortKey === "name" ? a.ward.name : sortKey === "lgaName" ? a.ward.lgaName : a.ward.state;
        const bValue = sortKey === "name" ? b.ward.name : sortKey === "lgaName" ? b.ward.lgaName : b.ward.state;
        comparison = aValue.localeCompare(bValue);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [rows, search, riskFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredAndSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  function handleFilterChange(value: RiskFilter) {
    setRiskFilter(value);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-flood">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-ink/8 bg-mist-dim/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search ward, LGA, or state…"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="w-full rounded-lg border border-ink/12 bg-white px-3.5 py-2 text-sm text-ink placeholder:text-slate-soft focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20 sm:w-72"
        />

        <select
          value={riskFilter}
          onChange={(event) => handleFilterChange(event.target.value as RiskFilter)}
          className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
        >
          <option value="all">All risk levels</option>
          <option value="high">High risk</option>
          <option value="moderate">Moderate risk</option>
          <option value="low">Low risk</option>
          <option value="pending">Pending data</option>
        </select>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink">No wards match your filters</p>
          <p className="mt-2 text-sm text-slate-soft">Try a different search term or risk level.</p>
        </div>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/8 bg-mist-dim/60 text-xs uppercase tracking-wide text-slate-soft">
              <tr>
                <th className="cursor-pointer select-none px-6 py-3 font-medium" onClick={() => handleSort("name")}>
                  Ward{sortIndicator("name")}
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 font-medium"
                  onClick={() => handleSort("lgaName")}
                >
                  LGA{sortIndicator("lgaName")}
                </th>
                <th className="cursor-pointer select-none px-6 py-3 font-medium" onClick={() => handleSort("state")}>
                  State{sortIndicator("state")}
                </th>
                <th
                  className="cursor-pointer select-none px-6 py-3 font-medium"
                  onClick={() => handleSort("riskScore")}
                >
                  Risk score{sortIndicator("riskScore")}
                </th>
                <th className="px-6 py-3 font-medium">Level</th>
                <th className="px-6 py-3 font-medium">Image</th>
                <th className="px-6 py-3 font-medium">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ ward, risk }) => (
                <tr key={ward.id} className="border-b border-ink/6 last:border-0">
                  <td className="px-6 py-4 font-medium text-ink">{ward.name}</td>
                  <td className="px-6 py-4 text-slate">{ward.lgaName}</td>
                  <td className="px-6 py-4 text-slate">{ward.state}</td>
                  <td className="px-6 py-4 font-data text-slate">{risk ? risk.riskScore.toFixed(2) : "—"}</td>
                  <td className="px-6 py-4">
                    {risk ? (
                      <RiskPill level={risk.riskLabel} />
                    ) : (
                      <span className="text-xs text-slate-soft">Pending data</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <SatelliteImageModal wardId={ward.id} wardName={ward.name} />
                  </td>
                  <td className="px-6 py-4">
                    <TriggerAlertButton wardId={ward.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-ink/8 px-6 py-4 text-sm text-slate-soft">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAndSorted.length)}{" "}
              of {filteredAndSorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-mist-dim/60 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-data text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-mist-dim/60 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
