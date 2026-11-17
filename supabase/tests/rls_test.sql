\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','a@x.io'), ('22222222-2222-2222-2222-222222222222','b@x.io');
select count(*) as profiles_created from public.profiles;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.saved_items (user_id, item_type, item_ref, label) values ('11111111-1111-1111-1111-111111111111','sense','setback-n','setback');
insert into public.attempts (id, user_id, exercise_slug, exercise_version, score, total, started_at) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','x',1,3,4,now());
insert into public.responses (attempt_id, user_id, question_id, response, correct) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','q1','{}',true);
select count(*) as a_sees_own from public.saved_items;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as b_sees_a_items from public.saved_items;
select count(*) as b_sees_a_profile from public.profiles where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  begin insert into public.saved_items (user_id, item_type, item_ref, label) values ('11111111-1111-1111-1111-111111111111','sense','x','x'); raise exception 'FAIL: B wrote into A';
  exception when insufficient_privilege then raise notice 'OK: B cannot write A rows'; end;
end $$;
update public.saved_items set label = 'hacked';
reset role;
select label as a_label_after_b_update from public.saved_items;
-- Migration 3: listening logs, weekly reports, preferences
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.listening_logs (user_id, resource_slug, minutes, comprehension) values ('11111111-1111-1111-1111-111111111111','bbc-6-minute-english',20,4);
insert into public.weekly_reports (user_id, week_start, overall, report) values ('11111111-1111-1111-1111-111111111111','2026-11-16',60,'{}');
insert into public.activity_events (user_id, type) values ('11111111-1111-1111-1111-111111111111','listening_logged');
update public.profiles set preferences = '{"speaking":{"mode":"two"}}' where id = '11111111-1111-1111-1111-111111111111';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as b_sees_a_listening from public.listening_logs;
select count(*) as b_sees_a_reports from public.weekly_reports;
do $$ begin
  begin insert into public.weekly_reports (user_id, week_start, report) values ('11111111-1111-1111-1111-111111111111','2026-11-09','{}'); raise exception 'FAIL: B wrote A report';
  exception when insufficient_privilege then raise notice 'OK: B cannot write A reports'; end;
  begin insert into public.listening_logs (user_id, resource_slug, minutes, comprehension) values ('22222222-2222-2222-2222-222222222222','x',0,9); raise exception 'FAIL: invalid listening log accepted';
  exception when check_violation then raise notice 'OK: listening log validated'; end;
end $$;
reset role;
select count(*) as a_listening, (select preferences->'speaking'->>'mode' from public.profiles where id='11111111-1111-1111-1111-111111111111') as a_mode from public.listening_logs;
-- Migration 4: drafts, writing status, dictionary cache
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.essay_drafts (user_id, prompt_slug, body) values ('11111111-1111-1111-1111-111111111111','gig-economy','draft text');
insert into public.writing_submissions (id, user_id, prompt_slug, body, word_count, status, client_request_id) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','gig-economy','essay',1,'pending','55555555-5555-5555-5555-555555555555');
update public.writing_submissions set status = 'failed', error = 'AI busy' where id = '44444444-4444-4444-4444-444444444444';
do $$ begin
  begin insert into public.writing_submissions (user_id, prompt_slug, body, word_count, client_request_id) values ('11111111-1111-1111-1111-111111111111','gig-economy','dup',1,'55555555-5555-5555-5555-555555555555'); raise exception 'FAIL: duplicate request id accepted';
  exception when unique_violation then raise notice 'OK: duplicate submission rejected'; end;
  begin insert into public.dictionary_cache (key, entry) values ('poison','{}'); raise exception 'FAIL: learner wrote dictionary cache';
  exception when insufficient_privilege then raise notice 'OK: learners cannot write the dictionary cache'; end;
end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as b_sees_a_drafts from public.essay_drafts;
update public.writing_submissions set status = 'assessed' where id = '44444444-4444-4444-4444-444444444444';
reset role;
select status as a_status_after_b_update from public.writing_submissions where id = '44444444-4444-4444-4444-444444444444';
insert into public.dictionary_cache (key, entry) values ('many', '{"lemma":"many"}');
grant select on public.dictionary_cache to anon; -- Supabase grants this by default
set role anon;
select count(*) as anon_reads_cache from public.dictionary_cache;
reset role;
