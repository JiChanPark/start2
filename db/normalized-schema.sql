create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null check (role in ('OWNER', 'MENTOR', 'GRAD_STUDENT', 'INTERN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  affiliation text not null,
  major text not null,
  mentor_name text not null,
  internship_start_date date not null,
  internship_end_date date not null,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'PAUSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.missions (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  order_index integer not null
);

create table if not exists public.mission_assignments (
  id text primary key,
  student_id text not null references public.student_profiles(id) on delete cascade,
  mission_id text not null references public.missions(id) on delete cascade,
  assigned_date date not null,
  status text not null check (status in ('TODO', 'DONE', 'SKIPPED')),
  note text not null default '',
  self_goal text not null default '',
  achievement_rate integer not null default 0,
  self_evaluation text not null default '',
  checked_at timestamptz,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reflections (
  id text primary key,
  student_id text not null references public.student_profiles(id) on delete cascade,
  reflection_date date not null,
  today_work text not null default '',
  tomorrow_plan text not null default '',
  observed text not null default '',
  learned text not null default '',
  importance text not null default '',
  question text not null default '',
  ai_feedback text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_notes (
  id text primary key,
  student_id text not null references public.student_profiles(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('DAILY_MENTOR', 'WEEKLY_OWNER')),
  note_date date not null,
  week_start_date date,
  week_end_date date,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_reports (
  id text primary key,
  student_id text not null references public.student_profiles(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  summary text not null default '',
  suggestions text not null default '',
  wants_to_try text not null default '',
  new_interests text not null default '',
  impressive_materials text not null default '',
  next_week_plan text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_notices (
  id text primary key,
  title text not null,
  meeting_date date not null,
  start_time text not null,
  end_time text not null,
  location text not null,
  agenda text not null,
  created_by text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pinned boolean not null default false
);

create table if not exists public.presentation_files (
  id text primary key,
  student_id text not null references public.student_profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  file_data_url text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_assignments enable row level security;
alter table public.reflections enable row level security;
alter table public.mentor_notes enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.meeting_notices enable row level security;
alter table public.presentation_files enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'student_profiles',
    'missions',
    'mission_assignments',
    'reflections',
    'mentor_notes',
    'weekly_reports',
    'meeting_notices',
    'presentation_files'
  ]
  loop
    execute format('drop policy if exists authenticated_select on public.%I', table_name);
    execute format('drop policy if exists authenticated_insert on public.%I', table_name);
    execute format('drop policy if exists authenticated_update on public.%I', table_name);
    execute format('drop policy if exists authenticated_delete on public.%I', table_name);
    execute format('create policy authenticated_select on public.%I for select to authenticated using (true)', table_name);
    execute format('create policy authenticated_insert on public.%I for insert to authenticated with check (true)', table_name);
    execute format('create policy authenticated_update on public.%I for update to authenticated using (true) with check (true)', table_name);
    execute format('create policy authenticated_delete on public.%I for delete to authenticated using (true)', table_name);
  end loop;
end $$;
