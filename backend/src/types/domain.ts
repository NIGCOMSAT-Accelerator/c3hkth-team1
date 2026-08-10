export interface Ward {
  id: string;
  name: string;
  lgaId: string;
  lgaName: string;
  state: string;
  satelliteImageUrl?: string | null;
  satelliteImageUpdatedAt?: string | null;
  cachedRiskScore?: number | null;
  cachedRiskLabel?: RiskLabel | null;
  cachedContributingFactors?: Record<string, number> | null;
  cachedRiskUpdatedAt?: string | null;
}

export interface WardFeatures {
  wardId: string;
  waterFraction: number | null;
  rainfallAnomalyMm: number | null;
  populationDensity: number | null;
}

export type HealthWorkerRole = "chew" | "lga_coordinator" | "state_official";

export interface HealthWorker {
  id: string;
  wardId: string;
  fullName: string;
  role: HealthWorkerRole;
  phoneNumber: string;
  email: string | null;
  whatsappCapable: boolean;
  createdAt: string;
}

export interface NewHealthWorker {
  wardId: string;
  fullName: string;
  role: HealthWorkerRole;
  phoneNumber: string;
  email?: string | null;
  whatsappCapable?: boolean;
}

export type RiskLabel = "low" | "moderate" | "high";

export type AppUserRole = "government" | "lga_official" | "ward_official";

export interface UserProfile {
  id: string;
  fullName: string;
  role: AppUserRole;
  lgaId: string | null;
  wardId: string | null;
  alertThreshold: number | null;
  phoneNumber: string | null;
  isWhatsappCapable: boolean;
  createdAt: string;
}

export interface NewUserProfile {
  id: string;
  fullName: string;
  role: AppUserRole;
  lgaId?: string | null;
  wardId?: string | null;
  phoneNumber?: string | null;
  isWhatsappCapable?: boolean;
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

export interface NewAuditLogEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RiskAssessment {
  wardId: string;
  riskScore: number;
  riskLabel: RiskLabel;
  contributingFactors: Record<string, number>;
}

export type AlertChannel = "sms" | "whatsapp" | "email";
export type AlertStatus = "sent" | "failed";

export interface NewAlert {
  wardId: string;
  healthWorkerId: string;
  channel: AlertChannel;
  riskScore: number;
  riskLabel: RiskLabel;
  message: string;
  status: AlertStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface Alert extends NewAlert {
  id: string;
  createdAt: string;
}
