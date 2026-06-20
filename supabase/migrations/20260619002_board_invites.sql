-- Email-invite flow: fixes the chicken-and-egg where an invitee had to sign in
-- once before an owner could add them. Now an owner can invite any email; if
-- there's no account yet the invite is recorded and consumed on first sign-in.

create table if not exists public.board_invites (
  board_id   uuid not null references public.boards (id) on delete cascade,
  email      text not null,                 -- always stored lowercased
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (board_id, email)
);

create index if not exists board_invites_email_idx on public.board_invites (email);

-- add_board_member now returns its outcome ('added' | 'invited'). Return type
-- changed, so drop the old void signature first.
drop function if exists public.add_board_member(uuid, text);

create or replace function public.add_board_member(board uuid, member_email text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  target     uuid;
  normalized text := lower(trim(member_email));
begin
  if not public.is_board_owner(board) then
    raise exception 'Only an owner can add members';
  end if;
  if normalized = '' then
    raise exception 'Enter an email address';
  end if;

  select id into target from public.profiles where lower(email) = normalized;
  if target is not null then
    insert into public.board_members (board_id, user_id, role)
    values (board, target, 'member')
    on conflict (board_id, user_id) do nothing;
    return 'added';
  end if;

  -- No account yet: record a pending invite.
  insert into public.board_invites (board_id, email, invited_by)
  values (board, normalized, auth.uid())
  on conflict (board_id, email) do nothing;
  return 'invited';
end;
$$;

-- Consume pending invites when the invitee signs in for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  insert into public.board_members (board_id, user_id, role)
  select bi.board_id, new.id, 'member'
    from public.board_invites bi
   where bi.email = lower(new.email)
  on conflict (board_id, user_id) do nothing;

  delete from public.board_invites where email = lower(new.email);

  return new;
end;
$$;

-- ---------- Grants + RLS ----------
-- Members read pending invites; owners revoke them. Inserts only happen through
-- the SECURITY DEFINER add_board_member RPC — there is no insert grant/policy.
grant select, delete on public.board_invites to authenticated;

alter table public.board_invites enable row level security;

drop policy if exists invites_read on public.board_invites;
create policy invites_read on public.board_invites
  for select to authenticated using (public.is_board_member(board_id));

drop policy if exists invites_delete on public.board_invites;
create policy invites_delete on public.board_invites
  for delete to authenticated using (public.is_board_owner(board_id));
