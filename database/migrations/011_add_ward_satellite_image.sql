alter table wards
    add column if not exists satellite_image_url text,
    add column if not exists satellite_image_updated_at timestamptz;
