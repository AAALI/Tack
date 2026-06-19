-- =====================================================================
-- RLS regression tests
-- ---------------------------------------------------------------------
-- Run via `supabase test db` (supabase-cli bundles pgTAP locally).
-- Schema is applied via the files in `supabase/migrations/` before the
-- test session starts; this file only asserts behaviour.
--
-- Principle: the database is the security boundary. These tests will
-- catch a regression that weakens RLS before the app ever sees it.
-- =====================================================================

begin;
select plan(16);

-- ---------- Personas ----------
-- The new-user trigger (handle_new_user) auto-populates public.profiles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@tack.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@tack.test'),
  ('33333333-3333-3333-3333-333333333333', 'carol@tack.test');

select is(
  (select count(*)::int from public.profiles
    where id in (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    )),
  3,
  'handle_new_user trigger creates a profile row per auth user'
);

set local role authenticated;

-- ---------- Alice creates a board, becomes owner ----------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin perform public.create_board('Alice Board'); end $$;

select is(
  (select count(*)::int from public.boards
     where created_by = '11111111-1111-1111-1111-111111111111'),
  1,
  'create_board inserts a board owned by auth.uid()'
);

select is(
  (select count(*)::int from public.columns
     where board_id = (
       select id from public.boards
        where created_by = '11111111-1111-1111-1111-111111111111'
     )),
  4,
  'create_board seeds 4 stages (Backlog / To Do / In Progress / Done)'
);

select isnt(
  (select prefix from public.boards
     where created_by = '11111111-1111-1111-1111-111111111111'),
  null,
  'create_board derives a non-null prefix'
);

select matches(
  (select prefix from public.boards
     where created_by = '11111111-1111-1111-1111-111111111111'),
  '^[A-Z0-9]{3}$',
  'derived prefix matches the format constraint'
);

-- ---------- Card numbering trigger ----------
do $$
declare
  bid uuid;
  cid uuid;
begin
  select id into bid from public.boards
    where created_by = '11111111-1111-1111-1111-111111111111';
  select id into cid from public.columns where board_id = bid limit 1;

  insert into public.cards (board_id, column_id, title) values (bid, cid, 'a');
  insert into public.cards (board_id, column_id, title) values (bid, cid, 'b');
  insert into public.cards (board_id, column_id, title) values (bid, cid, 'c');
end $$;

select is(
  (select array_agg(number order by number)
     from public.cards
    where board_id = (
      select id from public.boards
       where created_by = '11111111-1111-1111-1111-111111111111'
    )),
  array[1, 2, 3]::int[],
  'assign_card_number trigger assigns 1..N per board'
);

-- ---------- Activity log: insert trigger writes a 'created' event per card ----------
select is(
  (select count(*)::int from public.card_events
    where board_id = (
      select id from public.boards
       where created_by = '11111111-1111-1111-1111-111111111111'
    ) and kind = 'created'),
  3,
  'log_card_event trigger records a created event for each new card'
);

-- ---------- Alice adds Bob as a member by email ----------
do $$
declare bid uuid;
begin
  select id into bid from public.boards
    where created_by = '11111111-1111-1111-1111-111111111111';
  perform public.add_board_member(bid, 'bob@tack.test');
end $$;

select is(
  (select count(*)::int from public.board_members
    where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'add_board_member adds Bob to the board'
);

-- ---------- Carol (non-member) is denied everything ----------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*)::int from public.boards),
  0,
  'Non-member cannot SELECT any board (RLS hides it)'
);

select is(
  (select count(*)::int from public.cards),
  0,
  'Non-member cannot SELECT any card'
);

select is(
  (select count(*)::int from public.card_events),
  0,
  'Non-member cannot SELECT any card event'
);

select throws_ok(
  $$ insert into public.card_events (card_id, board_id, kind)
     values (gen_random_uuid(), gen_random_uuid(), 'created') $$,
  '42501',
  null,
  'No one can INSERT card events through the API (trigger-only, no grant)'
);

select throws_ok(
  $$ insert into public.cards (board_id, column_id, title)
     select b.id, c.id, 'sneaky'
       from public.boards b
       join public.columns c on c.board_id = b.id
      limit 1 $$,
  '23502',
  null,
  'Non-member INSERT is blocked (board_id resolves to no rows under RLS, NOT NULL fails)'
);

-- ---------- profiles_read is co-member-scoped ----------
-- Carol shares no boards with Alice, so she cannot see Alice's profile…
select is(
  (select count(*)::int from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'Non-co-member cannot read another user''s profile'
);

-- …but can always read her own.
select is(
  (select count(*)::int from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  1,
  'A user can always read their own profile'
);

-- ---------- Bob (member, not owner) cannot manage members ----------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Bob sees Alice (co-member of the board).
select is(
  (select count(*)::int from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'Co-member can read the other member''s profile'
);

select throws_ok(
  $$ select public.add_board_member(
       (select id from public.boards limit 1),
       'carol@tack.test'
     ) $$,
  'P0001',
  'Only an owner can add members',
  'Non-owner cannot add board members'
);

select * from finish();
rollback;
