create table if not exists lgas (
    id uuid primary key default gen_random_uuid(),
    state text not null,
    name text not null,
    external_code text unique,
    created_at timestamptz not null default now(),
    unique (state, name)
);

create table if not exists wards (
    id uuid primary key default gen_random_uuid(),
    lga_id uuid not null references lgas (id) on delete cascade,
    name text not null,
    external_code text unique,
    boundary geometry(multipolygon, 4326) not null,
    population integer,
    created_at timestamptz not null default now(),
    unique (lga_id, name)
);

create index if not exists idx_wards_boundary on wards using gist (boundary);
create index if not exists idx_wards_lga_id on wards (lga_id);
