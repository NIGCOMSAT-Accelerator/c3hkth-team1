create type health_worker_role as enum ('chew', 'lga_coordinator', 'state_official');

create table if not exists health_workers (
    id uuid primary key default gen_random_uuid(),
    ward_id uuid not null references wards (id) on delete cascade,
    full_name text not null,
    role health_worker_role not null,
    phone_number text not null,
    email text,
    created_at timestamptz not null default now(),
    unique (ward_id, phone_number)
);

create index if not exists idx_health_workers_ward_id on health_workers (ward_id);
