create table if not exists malaria_incidence_labels (
    id uuid primary key default gen_random_uuid(),
    ward_id uuid not null references wards (id) on delete cascade,
    period_start date not null,
    period_end date not null,
    incidence_per_1000 double precision not null,
    outbreak_flag boolean not null,
    source text not null,
    created_at timestamptz not null default now(),
    unique (ward_id, period_start, period_end)
);

create index if not exists idx_malaria_labels_ward_period
    on malaria_incidence_labels (ward_id, period_start, period_end);
