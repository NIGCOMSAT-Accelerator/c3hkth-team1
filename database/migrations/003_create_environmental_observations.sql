create type observation_source as enum ('sentinel1', 'chirps', 'worldpop');

create table if not exists environmental_observations (
    id uuid primary key default gen_random_uuid(),
    ward_id uuid not null references wards (id) on delete cascade,
    source observation_source not null,
    observed_on date not null,
    metric_name text not null,
    metric_value double precision not null,
    raw_payload jsonb,
    created_at timestamptz not null default now(),
    unique (ward_id, source, observed_on, metric_name)
);

create index if not exists idx_env_obs_ward_date on environmental_observations (ward_id, observed_on);
create index if not exists idx_env_obs_source on environmental_observations (source);
