"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AlertAnalytics } from "@/lib/api";

const COLORS = {
  low: "#2F8F5B",
  moderate: "#E8A33D",
  high: "#D64545",
  pending: "#6B7A82",
  flood: "#1C6E8C",
  alert: "#D64545",
};

export interface RiskDistribution {
  low: number;
  moderate: number;
  high: number;
  pending: number;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink/8 bg-white p-6 shadow-[var(--shadow-panel)]">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export function RiskDistributionChart({ distribution }: { distribution: RiskDistribution }) {
  const data = [
    { name: "Low", count: distribution.low, fill: COLORS.low },
    { name: "Moderate", count: distribution.moderate, fill: COLORS.moderate },
    { name: "High", count: distribution.high, fill: COLORS.high },
    { name: "Pending", count: distribution.pending, fill: COLORS.pending },
  ];

  return (
    <ChartCard title="Wards by risk level">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0B1B2B0F" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7A82" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7A82" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#0B1B2B08" }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AlertsOverTimeChart({ byDay }: { byDay: AlertAnalytics["byDay"] }) {
  const data = byDay.map((entry) => ({
    date: entry.date.slice(5),
    Sent: entry.sent,
    Failed: entry.failed,
  }));

  return (
    <ChartCard title="Alert volume, last 14 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.flood} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.flood} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.alert} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.alert} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0B1B2B0F" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7A82" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7A82" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Sent" stroke={COLORS.flood} fill="url(#sentGradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="Failed" stroke={COLORS.alert} fill="url(#failedGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ChannelBreakdownChart({ byChannel }: { byChannel: AlertAnalytics["byChannel"] }) {
  const data = [
    { name: "SMS", Sent: byChannel.sms.sent, Failed: byChannel.sms.failed },
    { name: "WhatsApp", Sent: byChannel.whatsapp.sent, Failed: byChannel.whatsapp.failed },
    { name: "Email", Sent: byChannel.email.sent, Failed: byChannel.email.failed },
  ];

  return (
    <ChartCard title="Delivery by channel">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0B1B2B0F" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7A82" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7A82" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#0B1B2B08" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Sent" fill={COLORS.flood} radius={[6, 6, 0, 0]} />
          <Bar dataKey="Failed" fill={COLORS.alert} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
