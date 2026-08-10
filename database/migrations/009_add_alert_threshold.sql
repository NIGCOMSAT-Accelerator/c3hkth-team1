alter table user_profiles
    add column if not exists alert_threshold double precision;

alter table user_profiles
    add constraint alert_threshold_range check (
        alert_threshold is null or (alert_threshold >= 0 and alert_threshold <= 1)
    );
