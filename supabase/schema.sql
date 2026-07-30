-- MessMate Supabase schema
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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  code text not null unique check (code = upper(code)),
  owner_id uuid not null references auth.users(id) on delete restrict,
  currency text not null default '৳' check (currency in ('৳', '$', '₹')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 100),
  email text,
  phone text,
  room text,
  role text not null default 'member' check (role in ('manager', 'member')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists members_mess_user_unique
  on public.members(mess_id, user_id)
  where user_id is not null;

create index if not exists members_mess_id_idx
  on public.members(mess_id);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  meal_date date not null,
  breakfast numeric(6, 2) not null default 0 check (breakfast >= 0),
  lunch numeric(6, 2) not null default 0 check (lunch >= 0),
  dinner numeric(6, 2) not null default 0 check (dinner >= 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mess_id, member_id, meal_date)
);

create index if not exists meals_mess_date_idx
  on public.meals(mess_id, meal_date);

create table if not exists public.bazaar_entries (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  bazaar_date date not null,
  grand_total numeric(12, 2) not null check (grand_total > 0),
  receipt_path text,
  receipt_name text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bazaar_entries_mess_date_idx
  on public.bazaar_entries(mess_id, bazaar_date);

create table if not exists public.bazaar_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.bazaar_entries(id) on delete cascade,
  category text not null default 'Others',
  item_name text not null check (char_length(trim(item_name)) > 0),
  quantity numeric(10, 2) not null check (quantity > 0),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists bazaar_items_entry_id_idx
  on public.bazaar_items(entry_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists messes_set_updated_at on public.messes;
create trigger messes_set_updated_at
before update on public.messes
for each row execute function public.set_updated_at();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at
before update on public.meals
for each row execute function public.set_updated_at();

drop trigger if exists bazaar_entries_set_updated_at on public.bazaar_entries;
create trigger bazaar_entries_set_updated_at
before update on public.bazaar_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_mess_member(p_mess_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where mess_id = p_mess_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_mess_manager(p_mess_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where mess_id = p_mess_id
      and user_id = auth.uid()
      and role = 'manager'
  );
$$;

create or replace function public.owns_member_record(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where id = p_member_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.protect_member_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.role = 'manager'
    and new.role <> 'manager'
    and (
      select count(*)
      from public.members
      where mess_id = old.mess_id
        and role = 'manager'
    ) <= 1
  ) then
    raise exception 'A mess must always have at least one manager.';
  end if;

  if (
    new.role is distinct from old.role
    or new.mess_id is distinct from old.mess_id
    or new.user_id is distinct from old.user_id
  ) and not public.is_mess_manager(old.mess_id) then
    raise exception 'Only a mess manager can change membership security fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_member_security_fields on public.members;
create trigger protect_member_security_fields
before update on public.members
for each row execute function public.protect_member_security_fields();

alter table public.profiles enable row level security;
alter table public.messes enable row level security;
alter table public.members enable row level security;
alter table public.meals enable row level security;
alter table public.bazaar_entries enable row level security;
alter table public.bazaar_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "messes_select_member" on public.messes;
create policy "messes_select_member"
on public.messes for select
using (
  owner_id = auth.uid()
  or public.is_mess_member(id)
);

drop policy if exists "messes_insert_owner" on public.messes;
create policy "messes_insert_owner"
on public.messes for insert
with check (owner_id = auth.uid());

drop policy if exists "messes_update_manager" on public.messes;
create policy "messes_update_manager"
on public.messes for update
using (public.is_mess_manager(id))
with check (public.is_mess_manager(id));

drop policy if exists "members_select_same_mess" on public.members;
create policy "members_select_same_mess"
on public.members for select
using (
  public.is_mess_member(mess_id)
  or exists (
    select 1
    from public.messes
    where messes.id = members.mess_id
      and messes.owner_id = auth.uid()
  )
);

drop policy if exists "members_insert_manager" on public.members;
create policy "members_insert_manager"
on public.members for insert
with check (
  public.is_mess_manager(mess_id)
  or exists (
    select 1
    from public.messes
    where messes.id = members.mess_id
      and messes.owner_id = auth.uid()
  )
);

drop policy if exists "members_update_manager_or_self" on public.members;
create policy "members_update_manager_or_self"
on public.members for update
using (
  public.is_mess_manager(mess_id)
  or user_id = auth.uid()
)
with check (
  public.is_mess_manager(mess_id)
  or user_id = auth.uid()
);

drop policy if exists "members_delete_manager" on public.members;
create policy "members_delete_manager"
on public.members for delete
using (
  public.is_mess_manager(mess_id)
  and user_id is distinct from auth.uid()
);

drop policy if exists "meals_select_member" on public.meals;
create policy "meals_select_member"
on public.meals for select
using (public.is_mess_member(mess_id));

drop policy if exists "meals_insert_self_or_manager" on public.meals;
create policy "meals_insert_self_or_manager"
on public.meals for insert
with check (
  public.is_mess_member(mess_id)
  and (
    public.is_mess_manager(mess_id)
    or public.owns_member_record(member_id)
  )
);

drop policy if exists "meals_update_self_or_manager" on public.meals;
create policy "meals_update_self_or_manager"
on public.meals for update
using (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
)
with check (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
);

drop policy if exists "meals_delete_self_or_manager" on public.meals;
create policy "meals_delete_self_or_manager"
on public.meals for delete
using (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
);

drop policy if exists "bazaar_select_member" on public.bazaar_entries;
create policy "bazaar_select_member"
on public.bazaar_entries for select
using (public.is_mess_member(mess_id));

drop policy if exists "bazaar_insert_self_or_manager" on public.bazaar_entries;
create policy "bazaar_insert_self_or_manager"
on public.bazaar_entries for insert
with check (
  public.is_mess_member(mess_id)
  and (
    public.is_mess_manager(mess_id)
    or public.owns_member_record(member_id)
  )
);

drop policy if exists "bazaar_update_self_or_manager" on public.bazaar_entries;
create policy "bazaar_update_self_or_manager"
on public.bazaar_entries for update
using (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
)
with check (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
);

drop policy if exists "bazaar_delete_self_or_manager" on public.bazaar_entries;
create policy "bazaar_delete_self_or_manager"
on public.bazaar_entries for delete
using (
  public.is_mess_manager(mess_id)
  or public.owns_member_record(member_id)
);

drop policy if exists "bazaar_items_select_member" on public.bazaar_items;
create policy "bazaar_items_select_member"
on public.bazaar_items for select
using (
  exists (
    select 1
    from public.bazaar_entries entry
    where entry.id = bazaar_items.entry_id
      and public.is_mess_member(entry.mess_id)
  )
);

drop policy if exists "bazaar_items_insert_owner" on public.bazaar_items;
create policy "bazaar_items_insert_owner"
on public.bazaar_items for insert
with check (
  exists (
    select 1
    from public.bazaar_entries entry
    where entry.id = bazaar_items.entry_id
      and (
        public.is_mess_manager(entry.mess_id)
        or public.owns_member_record(entry.member_id)
      )
  )
);

drop policy if exists "bazaar_items_update_owner" on public.bazaar_items;
create policy "bazaar_items_update_owner"
on public.bazaar_items for update
using (
  exists (
    select 1
    from public.bazaar_entries entry
    where entry.id = bazaar_items.entry_id
      and (
        public.is_mess_manager(entry.mess_id)
        or public.owns_member_record(entry.member_id)
      )
  )
);

drop policy if exists "bazaar_items_delete_owner" on public.bazaar_items;
create policy "bazaar_items_delete_owner"
on public.bazaar_items for delete
using (
  exists (
    select 1
    from public.bazaar_entries entry
    where entry.id = bazaar_items.entry_id
      and (
        public.is_mess_manager(entry.mess_id)
        or public.owns_member_record(entry.member_id)
      )
  )
);

create or replace function public.make_mess_code(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
begin
  v_prefix := upper(
    left(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '', 'g'), 2)
  );

  if char_length(v_prefix) < 2 then
    v_prefix := 'MM';
  end if;

  loop
    v_code := v_prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1 from public.messes where code = v_code
    );
  end loop;

  return v_code;
end;
$$;

create or replace function public.create_mess_workspace(
  p_mess_name text,
  p_manager_name text,
  p_manager_phone text default null,
  p_manager_email text default null
)
returns table (
  mess_id uuid,
  mess_name text,
  mess_code text,
  currency text,
  member_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mess public.messes;
  v_member public.members;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(trim(coalesce(p_mess_name, ''))) < 2
    or char_length(trim(coalesce(p_manager_name, ''))) < 2 then
    raise exception 'Mess and manager names are required.';
  end if;

  insert into public.messes (name, code, owner_id)
  values (
    trim(p_mess_name),
    public.make_mess_code(p_mess_name),
    v_user_id
  )
  returning * into v_mess;

  insert into public.members (
    mess_id,
    user_id,
    name,
    email,
    phone,
    role
  )
  values (
    v_mess.id,
    v_user_id,
    trim(p_manager_name),
    nullif(trim(coalesce(p_manager_email, '')), ''),
    nullif(trim(coalesce(p_manager_phone, '')), ''),
    'manager'
  )
  returning * into v_member;

  return query
  select
    v_mess.id,
    v_mess.name,
    v_mess.code,
    v_mess.currency,
    v_member.id;
end;
$$;

create or replace function public.join_mess_by_code(
  p_code text,
  p_name text,
  p_phone text default null,
  p_email text default null
)
returns table (
  mess_id uuid,
  mess_name text,
  mess_code text,
  currency text,
  member_id uuid,
  member_role text,
  already_joined boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mess public.messes;
  v_member public.members;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Member name is required.';
  end if;

  select *
  into v_mess
  from public.messes
  where code = upper(trim(p_code));

  if v_mess.id is null then
    raise exception 'No mess found with this code.';
  end if;

  select *
  into v_member
  from public.members
  where members.mess_id = v_mess.id
    and members.user_id = v_user_id;

  if v_member.id is not null then
    return query
    select
      v_mess.id,
      v_mess.name,
      v_mess.code,
      v_mess.currency,
      v_member.id,
      v_member.role,
      true;
    return;
  end if;

  insert into public.members (
    mess_id,
    user_id,
    name,
    email,
    phone,
    role
  )
  values (
    v_mess.id,
    v_user_id,
    trim(p_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'member'
  )
  returning * into v_member;

  return query
  select
    v_mess.id,
    v_mess.name,
    v_mess.code,
    v_mess.currency,
    v_member.id,
    v_member.role,
    false;
end;
$$;

create or replace function public.regenerate_mess_code(p_mess_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_code text;
begin
  if not public.is_mess_manager(p_mess_id) then
    raise exception 'Only a mess manager can regenerate the code.';
  end if;

  select name into v_name
  from public.messes
  where id = p_mess_id;

  v_code := public.make_mess_code(v_name);

  update public.messes
  set code = v_code
  where id = p_mess_id;

  return v_code;
end;
$$;

create or replace function public.reset_mess_activity(p_mess_id uuid)
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

  delete from public.bazaar_entries
  where mess_id = p_mess_id;

  delete from public.meals
  where mess_id = p_mess_id;
end;
$$;

revoke all on function public.create_mess_workspace(text, text, text, text) from public;
revoke all on function public.join_mess_by_code(text, text, text, text) from public;
revoke all on function public.regenerate_mess_code(uuid) from public;
revoke all on function public.reset_mess_activity(uuid) from public;

grant execute on function public.create_mess_workspace(text, text, text, text) to authenticated;
grant execute on function public.join_mess_by_code(text, text, text, text) to authenticated;
grant execute on function public.regenerate_mess_code(uuid) to authenticated;
grant execute on function public.reset_mess_activity(uuid) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'bazaar-receipts',
  'bazaar-receipts',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts_select_mess_member" on storage.objects;
create policy "receipts_select_mess_member"
on storage.objects for select
using (
  bucket_id = 'bazaar-receipts'
  and public.is_mess_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists "receipts_insert_owner" on storage.objects;
create policy "receipts_insert_owner"
on storage.objects for insert
with check (
  bucket_id = 'bazaar-receipts'
  and public.is_mess_member(
    ((storage.foldername(name))[1])::uuid
  )
  and (
    public.is_mess_manager(
      ((storage.foldername(name))[1])::uuid
    )
    or public.owns_member_record(
      ((storage.foldername(name))[2])::uuid
    )
  )
);

drop policy if exists "receipts_delete_owner" on storage.objects;
create policy "receipts_delete_owner"
on storage.objects for delete
using (
  bucket_id = 'bazaar-receipts'
  and (
    public.is_mess_manager(
      ((storage.foldername(name))[1])::uuid
    )
    or public.owns_member_record(
      ((storage.foldername(name))[2])::uuid
    )
  )
);
