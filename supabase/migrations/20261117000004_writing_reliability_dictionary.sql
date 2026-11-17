-- Reliable essay submission, cross-device drafts and a shared dictionary cache.

-- Essays are saved BEFORE the AI call; status tracks the assessment.
alter table public.writing_submissions add column if not exists status text not null default 'assessed'
  check (status in ('pending','assessed','failed'));
alter table public.writing_submissions add column if not exists error text;
alter table public.writing_submissions add column if not exists client_request_id uuid;
alter table public.writing_submissions add column if not exists updated_at timestamptz not null default now();
-- One submission per click: the browser sends a request id, retries reuse it.
create unique index if not exists writing_submissions_request on public.writing_submissions (user_id, client_request_id) where client_request_id is not null;
create policy "own rows update" on public.writing_submissions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Drafts follow the learner between devices.
create table public.essay_drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_slug text not null,
  body text not null check (char_length(body) <= 12000),
  updated_at timestamptz not null default now(),
  primary key (user_id, prompt_slug)
);
alter table public.essay_drafts enable row level security;
create policy "own rows" on public.essay_drafts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared dictionary cache: anyone may read; only the server (service role) writes.
create table public.dictionary_cache (
  key text primary key check (char_length(key) <= 80),
  entry jsonb not null,
  source text,
  updated_at timestamptz not null default now()
);
alter table public.dictionary_cache enable row level security;
create policy "read dictionary cache" on public.dictionary_cache for select using (true);
