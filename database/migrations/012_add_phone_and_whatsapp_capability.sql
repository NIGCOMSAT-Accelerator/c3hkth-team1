alter table user_profiles
    add column if not exists phone_number text,
    add column if not exists is_whatsapp_capable boolean not null default true;

alter table health_workers
    add column if not exists whatsapp_capable boolean not null default true;
