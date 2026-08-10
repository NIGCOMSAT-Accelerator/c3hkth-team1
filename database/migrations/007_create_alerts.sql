create type alert_channel as enum ('sms', 'whatsapp');
create type alert_status as enum ('sent', 'failed');

create table if not exists alerts (
    id uuid primary key default gen_random_uuid(),
    ward_id uuid not null references wards (id) on delete cascade,
    health_worker_id uuid not null references health_workers (id) on delete cascade,
    channel alert_channel not null,
    risk_score double precision not null,
    risk_label text not null,
    message text not null,
    status alert_status not null,
    provider_message_id text,
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists idx_alerts_ward_id on alerts (ward_id, created_at desc);
create index if not exists idx_alerts_health_worker_id on alerts (health_worker_id);
