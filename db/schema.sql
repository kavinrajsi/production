-- Production app schema for Neon Postgres.
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql

begin;

create table if not exists employees (
  id              bigint generated always as identity primary key,
  employee_number text,
  first_name      text,
  middle_name     text,
  last_name       text,
  work_email      text not null,
  personal_email  text,
  mobile_number   text,
  designation     text,
  department      text,
  employee_type   text,
  employee_status text not null default 'active',
  date_of_joining date,
  created_at      timestamptz not null default now()
);

-- Auth users are matched to employees by email, case-insensitively.
create unique index if not exists employees_work_email_key
  on employees (lower(work_email));

create table if not exists roles (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists employee_roles (
  employee_id bigint not null references employees (id) on delete cascade,
  role_id     bigint not null references roles (id) on delete cascade,
  primary key (employee_id, role_id)
);

create table if not exists production_equipment (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  category    text,
  quantity    integer not null default 1 check (quantity >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_by  bigint references employees (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists production_shoots (
  id              bigint generated always as identity primary key,
  title           text not null,
  client_name     text,
  location        text,
  notes           text,
  shoot_start     timestamptz not null,
  shoot_end       timestamptz not null,
  status          text not null default 'planned'
                  check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  photographer_id bigint references employees (id) on delete set null,
  created_at      timestamptz not null default now(),
  check (shoot_end >= shoot_start)
);

create index if not exists production_shoots_photographer_idx
  on production_shoots (photographer_id);
create index if not exists production_shoots_range_idx
  on production_shoots (shoot_start, shoot_end);

create table if not exists production_shoot_equipment (
  id           bigint generated always as identity primary key,
  shoot_id     bigint not null references production_shoots (id) on delete cascade,
  equipment_id bigint not null references production_equipment (id) on delete restrict,
  quantity     integer not null check (quantity > 0)
);

create index if not exists production_shoot_equipment_shoot_idx
  on production_shoot_equipment (shoot_id);
create index if not exists production_shoot_equipment_equipment_idx
  on production_shoot_equipment (equipment_id);

create table if not exists production_shoot_photos (
  id          bigint generated always as identity primary key,
  shoot_id    bigint not null references production_shoots (id) on delete cascade,
  kind        text not null check (kind in ('before', 'after')),
  url         text not null,
  uploaded_by bigint references employees (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists production_shoot_photos_shoot_idx
  on production_shoot_photos (shoot_id);

create table if not exists activity_logs (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_email text,
  action     text not null,
  table_name text,
  record_id  text,
  metadata   jsonb
);

create index if not exists activity_logs_created_at_idx
  on activity_logs (created_at desc);

-- Remaining available units for a piece of equipment in a date range.
-- Cancelled and completed shoots do not hold equipment.
create or replace function equipment_available_qty(
  p_equipment_id     bigint,
  p_start            timestamptz,
  p_end              timestamptz,
  p_exclude_shoot_id bigint default null
) returns integer
language sql
stable
as $$
  select e.quantity - coalesce((
    select sum(se.quantity)::integer
    from production_shoot_equipment se
    join production_shoots s on s.id = se.shoot_id
    where se.equipment_id = p_equipment_id
      and s.status in ('planned', 'in_progress')
      and (p_exclude_shoot_id is null or s.id <> p_exclude_shoot_id)
      and s.shoot_start < p_end
      and s.shoot_end > p_start
  ), 0)
  from production_equipment e
  where e.id = p_equipment_id;
$$;

insert into roles (name) values ('admin')
on conflict (name) do nothing;

commit;
