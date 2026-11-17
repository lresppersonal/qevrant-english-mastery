-- Phase: listening library, weekly reports, preferences and finer deletion controls.

-- New activity types (speaking sessions from the studio, listening logs).
alter table public.activity_events drop constraint if exists activity_events_type_check;
alter table public.activity_events add constraint activity_events_type_check check (type in (
  'lesson_section_viewed','exercise_completed','answer_submitted','item_saved','item_unsaved',
  'review_completed','reading_completed','writing_submitted','speaking_submitted','listening_logged'));

-- Learner preferences (e.g. speaking mode, lesson view, preferred accent).
alter table public.profiles add column if not exists preferences jsonb not null default '{}'::jsonb;

-- Listening log: what the learner listened to on external sites and how much they understood.
create table public.listening_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_slug text not null,
  episode text check (char_length(episode) <= 300),
  minutes int not null check (minutes between 1 and 600),
  comprehension smallint not null check (comprehension between 1 and 5),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now()
);
create index listening_user on public.listening_logs (user_id, created_at desc);

-- Weekly progress reports (saved so weeks can be compared).
create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  overall int check (overall between 0 and 100),
  report jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index weekly_reports_user on public.weekly_reports (user_id, week_start desc);

alter table public.listening_logs enable row level security;
alter table public.weekly_reports enable row level security;
create policy "own rows" on public.listening_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.weekly_reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Speaking: the learner may remove a stored recording but keep the transcript and feedback.
create policy "own rows update" on public.speaking_attempts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
