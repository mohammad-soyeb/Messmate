-- MessMate: opening balance, advance deposit and month transfer
-- Run this complete file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.member_financial_entries (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  entry_month date not null,
  entry_type text not null check (
    entry_type in ('opening_balance', 'deposit')
  ),
  amount numeric(12, 2) not null check (
    entry_type = 'opening_balance' or amount > 0
  ),
  transaction_date date not null,
  note text check (
    note is null or char_length(note) <= 160
  ),
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_financial_month_start_check check (
    entry_month = date_trunc('month', entry_month)::date
  ),
  constraint member_financial_date_month_check check (
    date_trunc('month', transaction_date)::date = entry_month
  )
);

create index if not exists member_financial_mess_month_idx
  on public.member_financial_entries(mess_id, entry_month);

create index if not exists member_financial_member_month_idx
  on public.member_financial_entries(member_id, entry_month);

create unique index if not exists member_financial_opening_unique
  on public.member_financial_entries(
    mess_id,
    member_id,
    entry_month
  )
  where entry_type = 'opening_balance';

drop trigger if exists member_financial_set_updated_at
  on public.member_financial_entries;

create trigger member_financial_set_updated_at
before update on public.member_financial_entries
for each row execute function public.set_updated_at();

alter table public.member_financial_entries
  enable row level security;

drop policy if exists "member_financial_select_member"
  on public.member_financial_entries;

create policy "member_financial_select_member"
on public.member_financial_entries for select
using (public.is_mess_member(mess_id));

drop policy if exists "member_financial_insert_manager"
  on public.member_financial_entries;

create policy "member_financial_insert_manager"
on public.member_financial_entries for insert
with check (
  public.is_mess_manager(mess_id)
  and exists (
    select 1
    from public.members member_row
    where member_row.id =
      member_financial_entries.member_id
      and member_row.mess_id =
        member_financial_entries.mess_id
  )
);

drop policy if exists "member_financial_update_manager"
  on public.member_financial_entries;

create policy "member_financial_update_manager"
on public.member_financial_entries for update
using (public.is_mess_manager(mess_id))
with check (
  public.is_mess_manager(mess_id)
  and exists (
    select 1
    from public.members member_row
    where member_row.id =
      member_financial_entries.member_id
      and member_row.mess_id =
        member_financial_entries.mess_id
  )
);

drop policy if exists "member_financial_delete_manager"
  on public.member_financial_entries;

create policy "member_financial_delete_manager"
on public.member_financial_entries for delete
using (public.is_mess_manager(mess_id));

grant select, insert, update, delete
on table public.member_financial_entries
to authenticated;

create or replace function public.set_member_opening_balance(
  p_mess_id uuid,
  p_member_id uuid,
  p_month date,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_mess_manager(p_mess_id) then
    raise exception 'Only a mess manager can set opening balances.';
  end if;

  if p_amount is null then
    raise exception 'Opening balance amount is required.';
  end if;

  if not exists (
    select 1
    from public.members
    where id = p_member_id
      and mess_id = p_mess_id
      and is_active = true
  ) then
    raise exception 'Active member not found in this mess.';
  end if;

  insert into public.member_financial_entries (
    mess_id,
    member_id,
    entry_month,
    entry_type,
    amount,
    transaction_date,
    note,
    created_by
  )
  values (
    p_mess_id,
    p_member_id,
    v_month,
    'opening_balance',
    p_amount,
    v_month,
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  on conflict (mess_id, member_id, entry_month)
    where entry_type = 'opening_balance'
  do update set
    amount = excluded.amount,
    transaction_date = excluded.transaction_date,
    note = excluded.note,
    updated_at = now()
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function public.carry_forward_member_balances(
  p_mess_id uuid,
  p_source_month date,
  p_balances jsonb
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_month date :=
    date_trunc('month', p_source_month)::date;
  v_target_month date :=
    (date_trunc('month', p_source_month) + interval '1 month')::date;
  v_item jsonb;
  v_member_id uuid;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_mess_manager(p_mess_id) then
    raise exception 'Only a mess manager can transfer balances.';
  end if;

  if p_balances is null
    or jsonb_typeof(p_balances) <> 'array'
    or jsonb_array_length(p_balances) = 0 then
    raise exception 'No member balances were provided.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_balances)
  loop
    v_member_id := (v_item ->> 'member_id')::uuid;
    v_amount := coalesce((v_item ->> 'amount')::numeric, 0);

    if not exists (
      select 1
      from public.members
      where id = v_member_id
        and mess_id = p_mess_id
        and is_active = true
    ) then
      raise exception 'An active member does not belong to this mess.';
    end if;

    insert into public.member_financial_entries (
      mess_id,
      member_id,
      entry_month,
      entry_type,
      amount,
      transaction_date,
      note,
      created_by
    )
    values (
      p_mess_id,
      v_member_id,
      v_target_month,
      'opening_balance',
      v_amount,
      v_target_month,
      'Carried forward from ' ||
        to_char(v_source_month, 'FMMonth YYYY'),
      auth.uid()
    )
    on conflict (mess_id, member_id, entry_month)
      where entry_type = 'opening_balance'
    do update set
      amount = excluded.amount,
      transaction_date = excluded.transaction_date,
      note = excluded.note,
      updated_at = now();
  end loop;

  return v_target_month;
end;
$$;

create or replace function public.reset_mess_activity(
  p_mess_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not public.is_mess_manager(p_mess_id) then
    raise exception 'Only a mess manager can reset activity data.';
  end if;

  delete from storage.objects
  where bucket_id = 'bazaar-receipts'
    and (storage.foldername(name))[1] = p_mess_id::text;

  delete from public.member_financial_entries
  where mess_id = p_mess_id;

  delete from public.bazaar_entries
  where mess_id = p_mess_id;

  delete from public.meals
  where mess_id = p_mess_id;
end;
$$;

revoke all on function public.set_member_opening_balance(
  uuid,
  uuid,
  date,
  numeric,
  text
) from public;

revoke all on function public.carry_forward_member_balances(
  uuid,
  date,
  jsonb
) from public;

grant execute on function public.set_member_opening_balance(
  uuid,
  uuid,
  date,
  numeric,
  text
) to authenticated;

grant execute on function public.carry_forward_member_balances(
  uuid,
  date,
  jsonb
) to authenticated;

notify pgrst, 'reload schema';