create type app_user_role as enum ('government', 'lga_official', 'ward_official');

create table if not exists user_profiles (
    id uuid primary key,
    full_name text not null,
    role app_user_role not null,
    lga_id uuid references lgas (id) on delete set null,
    ward_id uuid references wards (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint lga_official_requires_lga check (
        role != 'lga_official' or lga_id is not null
    ),
    constraint ward_official_requires_ward check (
        role != 'ward_official' or ward_id is not null
    )
);

create index if not exists idx_user_profiles_lga_id on user_profiles (lga_id);
create index if not exists idx_user_profiles_ward_id on user_profiles (ward_id);
