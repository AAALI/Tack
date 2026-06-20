-- Activity log: every card create / move / field edit is recorded as an
-- append-only event, written by a DB trigger (never the app). Surfaced in the
-- card modal's Activity section so a team can see "Sam moved this to Done".

create table if not exists public.card_events (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards (id)  on delete cascade,
  board_id   uuid not null references public.boards (id) on delete cascade,
  actor      uuid references auth.users (id) on delete set null,
  kind       text not null check (kind in ('created', 'moved', 'updated')),
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists card_events_card_idx  on public.card_events (card_id, created_at desc);
create index if not exists card_events_board_idx on public.card_events (board_id);

-- Trigger: record card lifecycle. SECURITY DEFINER so its inserts bypass the
-- append-only RLS below (the app deliberately has no insert policy here — only
-- this trigger writes events). DELETE is intentionally not logged: the card is
-- gone and the events cascade away with it.
create or replace function public.log_card_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.card_events (card_id, board_id, actor, kind)
    values (new.id, new.board_id, auth.uid(), 'created');
    return new;
  end if;

  -- A column change is a move (drag across columns, ◀ ▶ buttons).
  if new.column_id is distinct from old.column_id then
    insert into public.card_events (card_id, board_id, actor, kind, payload)
    values (
      new.id, new.board_id, auth.uid(), 'moved',
      jsonb_build_object(
        'from', (select title from public.columns where id = old.column_id),
        'to',   (select title from public.columns where id = new.column_id)
      )
    );
  end if;

  -- Field edits. Position-only changes (reordering) touch none of these, so a
  -- drag never spams the log.
  if new.title       is distinct from old.title       then changed := array_append(changed, 'title');       end if;
  if new.description is distinct from old.description  then changed := array_append(changed, 'description'); end if;
  if new.assignee    is distinct from old.assignee    then changed := array_append(changed, 'assignee');    end if;
  if new.due_date    is distinct from old.due_date    then changed := array_append(changed, 'due date');    end if;
  if new.priority    is distinct from old.priority    then changed := array_append(changed, 'priority');     end if;
  if new.labels      is distinct from old.labels      then changed := array_append(changed, 'labels');       end if;
  if new.links       is distinct from old.links       then changed := array_append(changed, 'links');        end if;

  if array_length(changed, 1) > 0 then
    insert into public.card_events (card_id, board_id, actor, kind, payload)
    values (new.id, new.board_id, auth.uid(), 'updated',
            jsonb_build_object('fields', changed));
  end if;

  return new;
end;
$$;

drop trigger if exists cards_log_event on public.cards;
create trigger cards_log_event
  after insert or update on public.cards
  for each row execute function public.log_card_event();

-- ---------- Grants + RLS (read-only for members) ----------
grant select on public.card_events to authenticated;

alter table public.card_events enable row level security;

drop policy if exists card_events_read on public.card_events;
create policy card_events_read on public.card_events
  for select to authenticated using (public.is_board_member(board_id));

-- ---------- Realtime (guarded so re-runs don't error) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'card_events'
  ) then
    alter publication supabase_realtime add table public.card_events;
  end if;
end $$;
