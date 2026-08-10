export type RiskLevel = "low" | "moderate" | "high";

const RISK_STYLES: Record<RiskLevel, { bg: string; fg: string; label: string }> = {
  low: { bg: "bg-low/10", fg: "text-low", label: "Low" },
  moderate: { bg: "bg-signal/15", fg: "text-signal", label: "Moderate" },
  high: { bg: "bg-alert/12", fg: "text-alert", label: "High" },
};

export function RiskPill({ level }: { level: RiskLevel }) {
  const style = RISK_STYLES[level];

  return (
    <span className={`risk-pill ${style.bg} ${style.fg}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label} risk
    </span>
  );
}
