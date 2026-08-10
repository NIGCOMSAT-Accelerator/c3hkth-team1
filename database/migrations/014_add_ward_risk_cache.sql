alter table wards
    add column if not exists cached_risk_score double precision,
    add column if not exists cached_risk_label text,
    add column if not exists cached_contributing_factors jsonb,
    add column if not exists cached_risk_updated_at timestamptz;
