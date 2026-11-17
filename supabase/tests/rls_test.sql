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
