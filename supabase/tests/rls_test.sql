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
