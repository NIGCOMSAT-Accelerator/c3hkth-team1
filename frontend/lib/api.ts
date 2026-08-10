export interface WardSummary {
  id: string;
  name: string;
  lgaId: string;
  lgaName: string;
  state: string;
  cachedRiskScore?: number | null;
  cachedRiskLabel?: "low" | "moderate" | "high" | null;
  cachedContributingFactors?: Record<string, number> | null;
  cachedRiskUpdatedAt?: string | null;
}

export interface WardRiskAssessment {
  wardId: string;
  riskScore: number;
  riskLabel: "low" | "moderate" | "high";
  contributingFactors: Record<string, number>;
}

export function cachedRiskFromWard(ward: WardSummary): WardRiskAssessment | null {
  if (ward.cachedRiskScore == null || ward.cachedRiskLabel == null) {
    return null;
  }
  return {
    wardId: ward.id,
    riskScore: ward.cachedRiskScore,
    riskLabel: ward.cachedRiskLabel,
    contributingFactors: ward.cachedContributingFactors ?? {},
  };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

async function safeGet<T>(path: string, accessToken?: string): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      cache: "no-store",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data: T };
    return body.data;
  } catch {
    return null;
  }
}

export async function fetchPublicWards(): Promise<WardSummary[]> {
  const data = await safeGet<WardSummary[]>("/public/wards");
  return data ?? [];
}

export async function fetchWards(accessToken: string): Promise<WardSummary[]> {
  const data = await safeGet<WardSummary[]>("/wards", accessToken);
  return data ?? [];
}

export interface OwnProfile {
  id: string;
  fullName: string;
  role: "government" | "lga_official" | "ward_official";
  lgaId: string | null;
  wardId: string | null;
  alertThreshold: number | null;
}

export interface AlertStatusCounts {
  sent: number;
  failed: number;
}

export async function fetchAlertStats(accessToken: string): Promise<AlertStatusCounts> {
  const data = await safeGet<AlertStatusCounts>("/wards/alerts/stats", accessToken);
  return data ?? { sent: 0, failed: 0 };
}

export interface AlertAnalytics {
  byChannel: {
    sms: { sent: number; failed: number };
    whatsapp: { sent: number; failed: number };
    email: { sent: number; failed: number };
  };
  byDay: Array<{ date: string; sent: number; failed: number }>;
}

export async function fetchAlertAnalytics(accessToken: string): Promise<AlertAnalytics> {
  const data = await safeGet<AlertAnalytics>("/wards/alerts/analytics", accessToken);
  return (
    data ?? {
      byChannel: {
        sms: { sent: 0, failed: 0 },
        whatsapp: { sent: 0, failed: 0 },
        email: { sent: 0, failed: 0 },
      },
      byDay: [],
    }
  );
}

export interface RecentAlert {
  id: string;
  wardId: string;
  wardName: string;
  healthWorkerId: string;
  channel: "sms" | "whatsapp" | "email";
  riskScore: number;
  riskLabel: "low" | "moderate" | "high";
  message: string;
  status: "sent" | "failed";
  createdAt: string;
}

export async function fetchRecentAlerts(accessToken: string): Promise<RecentAlert[]> {
  const data = await safeGet<RecentAlert[]>("/wards/alerts/recent", accessToken);
  return data ?? [];
}

export interface NotificationItem {
  id: string;
  wardId: string;
  wardName: string;
  healthWorkerId: string;
  channel: "sms" | "whatsapp" | "email";
  riskScore: number;
  riskLabel: "low" | "moderate" | "high";
  message: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationsResult {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationsFilters {
  page?: number;
  pageSize?: number;
  channel?: "sms" | "whatsapp" | "email";
  status?: "sent" | "failed";
  wardId?: string;
}

export async function fetchNotifications(
  accessToken: string,
  filters: NotificationsFilters = {}
): Promise<NotificationsResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.status) params.set("status", filters.status);
  if (filters.wardId) params.set("wardId", filters.wardId);

  const query = params.toString();

  try {
    const response = await fetch(`${BACKEND_URL}/wards/alerts${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }
    const body = (await response.json()) as {
      data: NotificationItem[];
      meta: { total: number; page: number; pageSize: number };
    };
    return { items: body.data, ...body.meta };
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }
}

export async function fetchWardRisk(wardId: string, accessToken: string): Promise<WardRiskAssessment | null> {
  return safeGet<WardRiskAssessment>(`/wards/${wardId}/risk`, accessToken);
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogsFilters {
  page?: number;
  pageSize?: number;
  action?: string;
}

export async function fetchAuditLogs(
  accessToken: string,
  filters: AuditLogsFilters = {}
): Promise<AuditLogsResult | null> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.action) params.set("action", filters.action);

  const query = params.toString();

  try {
    const response = await fetch(`${BACKEND_URL}/audit-logs${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      data: AuditLogEntry[];
      meta: { total: number; page: number; pageSize: number };
    };
    return { logs: body.data, ...body.meta };
  } catch {
    return null;
  }
}

export async function fetchOwnProfile(accessToken: string): Promise<OwnProfile | null> {
  return safeGet<OwnProfile>("/users/me", accessToken);
}
