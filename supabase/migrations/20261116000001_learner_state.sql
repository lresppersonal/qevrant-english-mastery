-- English Mastery by QEVRANT — learner state (Phase 3 vertical slice)
-- Curriculum content lives in versioned JSON in the repo (Phases 2–6) and is referenced
-- here by slug + version. Every table is protected by row-level security: a learner can
-- only ever read and write their own rows.

create extension if not exists pgcrypto;

-- ---------- QEVRANT-level account (shared by future products) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  goals text[] not null default '{}'::text[]
    check (goals <@ array['ielts','university','professional','general']::text[]),
  self_level text check (self_level in ('B2','B2+','C1','C2')),
  weekly_goal_days smallint not null default 4 check (weekly_goal_days between 1 and 7),
  timezone text not null default 'UTC',
  audio_storage_opt_in boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product entitlements: designed now, billing switched on later (decision 5).
create table public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null default 'english-mastery',
  plan text not null default 'free',
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, product)
);

-- ---------- Activity log: the single source for streaks and dashboard numbers ----------
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'lesson_section_viewed','exercise_completed','answer_submitted','item_saved','item_unsaved',
    'review_completed','reading_completed','writing_submitted','speaking_submitted')),
  content_type text,
  content_ref text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_user_time on public.activity_events (user_id, created_at desc);

-- ---------- Practice ----------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_slug text not null,
  exercise_version int not null,
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  started_at timestamptz not null,
  completed_at timestamptz not null default now()
);
create index attempts_user on public.attempts (user_id, completed_at desc);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  target_ref text,           -- lesson slug or sense id the question practises
  response jsonb not null,
  correct boolean not null,
  error_tag text,
  created_at timestamptz not null default now()
);
create index responses_user_target on public.responses (user_id, target_ref, created_at desc);

-- ---------- Personal Vocabulary, bookmarks, revision ----------
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('sense','custom','lesson_section')),
  item_ref text not null,        -- sense id, custom word, or lesson-slug#section
  label text not null,
  context text,                  -- sentence the item was saved from
  source_ref text,               -- where it was saved (e.g. reading slug)
  status text not null default 'new' check (status in ('new','learning','familiar','mastered')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_ref)
);

create table public.review_cards (
  saved_item_id uuid primary key references public.saved_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0,
  last_review timestamptz
);
create index review_cards_due on public.review_cards (user_id, due);

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  saved_item_id uuid not null references public.saved_items (id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  state smallint not null,
  due timestamptz not null,
  reviewed_at timestamptz not null default now()
);

create table public.last_positions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  href text not null check (href like '/%'),
  label text not null,
  updated_at timestamptz not null default now()
);

-- ---------- AI practice feedback (speaking + academic writing) ----------
create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_slug text not null,
  body text not null check (char_length(body) between 1 and 12000),
  word_count int not null,
  seconds_spent int,
  feedback jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index writing_user on public.writing_submissions (user_id, created_at desc);

create table public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_slug text not null,
  transcript text not null check (char_length(transcript) <= 12000),
  duration_seconds int not null,
  metrics jsonb not null default '{}'::jsonb,
  feedback jsonb,
  audio_path text,               -- only set when the learner opted in to audio storage
  model text,
  created_at timestamptz not null default now()
);
create index speaking_user on public.speaking_attempts (user_id, created_at desc);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------- New user bootstrap ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.entitlements (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.activity_events enable row level security;
alter table public.attempts enable row level security;
alter table public.responses enable row level security;
alter table public.saved_items enable row level security;
alter table public.review_cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.last_positions enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.speaking_attempts enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "read own entitlements" on public.entitlements for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['activity_events','attempts','responses','saved_items','review_cards','review_logs','last_positions'] loop
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
  -- AI submissions: the learner can read and delete their own; inserts happen server-side
  -- with the learner's session, after the AI call, so insert is also limited to own rows.
  foreach t in array array['writing_submissions','speaking_attempts'] loop
    execute format('create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Responses must belong to an attempt owned by the same learner.
create or replace function public.check_response_owner() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.attempts a where a.id = new.attempt_id and a.user_id = new.user_id) then
    raise exception 'attempt does not belong to user';
  end if;
  return new;
end $$;
create trigger responses_owner before insert on public.responses for each row execute function public.check_response_owner();

-- ---------- Account deletion (GDPR) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();  -- cascades to every table above
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
