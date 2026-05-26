-- Convites v2: server-side invite acceptance support.
-- Adds account-source tracking, keeps invite use_count in sync, backfills history.

-- 1. profiles: how the account was created + originating invite link.
alter table public.profiles
  add column if not exists signup_source text,
  add column if not exists invite_link_id uuid
    references public.invite_links(id) on delete set null;

-- 2. invite_link_uses: dedupe (defensive) then enforce one row per (link, student)
--    so re-submitting an invite can't double-count.
delete from public.invite_link_uses a
  using public.invite_link_uses b
  where a.ctid < b.ctid
    and a.invite_link_id = b.invite_link_id
    and a.student_id = b.student_id;

alter table public.invite_link_uses
  drop constraint if exists invite_link_uses_link_student_key;
alter table public.invite_link_uses
  add constraint invite_link_uses_link_student_key unique (invite_link_id, student_id);

-- 3. Keep invite_links.use_count in sync with invite_link_uses automatically,
--    so the count can never drift again (previous client-side increment was
--    blocked by RLS and silently failed).
create or replace function public.sync_invite_use_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.invite_link_id, old.invite_link_id);
  if target is not null then
    update public.invite_links
      set use_count = (
            select count(*) from public.invite_link_uses
            where invite_link_id = target
          ),
          updated_at = now()
    where id = target;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_invite_use_count on public.invite_link_uses;
create trigger trg_sync_invite_use_count
  after insert or delete on public.invite_link_uses
  for each row execute function public.sync_invite_use_count();

-- 3b. Recover historical invite uses: past invite signups set profiles.invite_link_id
--     (client self-update worked) but could not write invite_link_uses (RLS).
insert into public.invite_link_uses (invite_link_id, student_id, used_at)
select p.invite_link_id, p.id, coalesce(p.created_at, now())
from public.profiles p
where p.invite_link_id is not null
  and exists (select 1 from public.invite_links l where l.id = p.invite_link_id)
on conflict (invite_link_id, student_id) do nothing;

-- 4. Recompute current counts from the (source of truth) uses table.
update public.invite_links l
  set use_count = (
    select count(*) from public.invite_link_uses u where u.invite_link_id = l.id
  );

-- 5. Best-effort backfill of signup_source for existing students.
--    Invite history is unrecoverable (uses table was empty + columns didn't exist),
--    so we can only distinguish webhook buyers from everyone else.
update public.profiles p
  set signup_source = 'webhook'
  where p.signup_source is null
    and exists (
      select 1 from public.webhook_logs w
      where w.student_email is not null
        and lower(w.student_email) = lower(p.email)
    );

update public.profiles p
  set signup_source = 'direct'
  where p.signup_source is null;

-- 6. Auto-stamp 'webhook' origin on any account that comes through a sales
--    webhook (webhook_logs records every event). Only fills NULL, so it never
--    overwrites how an account was originally created.
create or replace function public.stamp_webhook_signup_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_email is not null then
    update public.profiles
      set signup_source = 'webhook'
      where lower(email) = lower(new.student_email)
        and signup_source is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_webhook_source on public.webhook_logs;
create trigger trg_stamp_webhook_source
  after insert on public.webhook_logs
  for each row execute function public.stamp_webhook_signup_source();
