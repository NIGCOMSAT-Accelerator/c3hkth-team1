create or replace view training_dataset as
select
    l.ward_id,
    w.name as ward_name,
    lg.state,
    l.period_start,
    l.period_end,
    l.incidence_per_1000,
    l.outbreak_flag,
    max(case when e.source = 'sentinel1' and e.metric_name = 'water_fraction'
        then e.metric_value end) as water_fraction,
    max(case when e.source = 'chirps' and e.metric_name = 'rainfall_anomaly_mm'
        then e.metric_value end) as rainfall_anomaly_mm,
    max(case when e.source = 'worldpop' and e.metric_name = 'population_density'
        then e.metric_value end) as population_density
from malaria_incidence_labels l
join wards w on w.id = l.ward_id
join lgas lg on lg.id = w.lga_id
left join environmental_observations e
    on e.ward_id = l.ward_id
    and e.observed_on between l.period_start and l.period_end
group by l.ward_id, w.name, lg.state, l.period_start, l.period_end,
    l.incidence_per_1000, l.outbreak_flag;
