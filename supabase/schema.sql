-- =====================================================
-- MESSMATE MANAGER PERMISSION UPDATE
-- Supabase Dashboard > SQL Editor > New Query
-- সম্পূর্ণ code একবার Run করবেন
-- =====================================================


-- =====================================================
-- 1. ADD ACTIVE MEMBERSHIP COLUMN
-- =====================================================

alter table public.members
add column if not exists is_active boolean;


update public.members
set is_active = true
where is_active is null;


alter table public.members
alter column is_active set default true;


alter table public.members
alter column is_active set not null;


-- =====================================================
-- 2. CHECK CURRENT MESS MEMBER
-- =====================================================

create or replace function public.is_mess_member(
  p_mess_id uuid
)
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
      and is_active = true
  );
$$;


-- =====================================================
-- 3. CHECK CURRENT MESS MANAGER
-- =====================================================

create or replace function public.is_mess_manager(
  p_mess_id uuid
)
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
      and is_active = true
  );
$$;


-- =====================================================
-- 4. CHECK MEMBER OWNERSHIP
-- =====================================================

create or replace function public.owns_member_record(
  p_member_id uuid
)
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
      and is_active = true
  );
$$;


-- =====================================================
-- 5. PROTECT MANAGER ROLE
-- =====================================================

create or replace function public.protect_member_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_manager_count integer;
begin
  -- একমাত্র manager নিজেকে member করতে পারবে না

  if (
    old.role = 'manager'
    and new.role <> 'manager'
  ) then
    select count(*)
    into v_active_manager_count
    from public.members
    where mess_id = old.mess_id
      and role = 'manager'
      and user_id is not null
      and is_active = true;

    if v_active_manager_count <= 1 then
      raise exception
        'A mess must always have at least one manager.';
    end if;
  end if;


  -- Login account ছাড়া কাউকে manager করা যাবে না

  if (
    new.role = 'manager'
    and new.user_id is null
  ) then
    raise exception
      'Only a member with a signed-in account can become a manager.';
  end if;


  -- Role, user এবং active status শুধু manager পরিবর্তন করবে

  if (
    new.role is distinct from old.role
    or new.mess_id is distinct from old.mess_id
    or new.user_id is distinct from old.user_id
    or new.is_active is distinct from old.is_active
  )
  and not public.is_mess_manager(old.mess_id)
  then
    raise exception
      'Only a mess manager can change membership security fields.';
  end if;

  return new;
end;
$$;


drop trigger if exists protect_member_security_fields
on public.members;


create trigger protect_member_security_fields
before update on public.members
for each row
execute function public.protect_member_security_fields();


-- =====================================================
-- 6. ENABLE RLS
-- =====================================================

alter table public.members
enable row level security;

alter table public.meals
enable row level security;

alter table public.bazaar_entries
enable row level security;

alter table public.bazaar_items
enable row level security;


-- =====================================================
-- 7. MEMBER SELECT POLICY
-- =====================================================

drop policy if exists "members_select_same_mess"
on public.members;


create policy "members_select_same_mess"
on public.members
for select
using (
  public.is_mess_member(mess_id)

  or exists (
    select 1
    from public.messes
    where messes.id = members.mess_id
      and messes.owner_id = auth.uid()
  )
);


-- =====================================================
-- 8. MEMBER INSERT POLICY
-- =====================================================

drop policy if exists "members_insert_manager"
on public.members;


create policy "members_insert_manager"
on public.members
for insert
with check (
  public.is_mess_manager(mess_id)

  or exists (
    select 1
    from public.messes
    where messes.id = members.mess_id
      and messes.owner_id = auth.uid()
  )
);


-- =====================================================
-- 9. MEMBER UPDATE POLICY
-- =====================================================

drop policy if exists "members_update_manager_or_self"
on public.members;


create policy "members_update_manager_or_self"
on public.members
for update
using (
  public.is_mess_manager(mess_id)
  or user_id = auth.uid()
)
with check (
  public.is_mess_manager(mess_id)
  or user_id = auth.uid()
);


-- =====================================================
-- 10. DIRECT MEMBER DELETE COMPLETELY DISABLED
-- =====================================================

drop policy if exists "members_delete_manager"
on public.members;

drop policy if exists "members_delete_self"
on public.members;

drop policy if exists "members_delete_manager_or_self"
on public.members;


-- =====================================================
-- 11. MEAL DELETE — MANAGER ONLY
-- =====================================================

drop policy if exists "meals_delete_self_or_manager"
on public.meals;

drop policy if exists "meals_delete_manager"
on public.meals;


create policy "meals_delete_manager"
on public.meals
for delete
using (
  public.is_mess_manager(mess_id)
);


-- =====================================================
-- 12. BAZAAR ENTRY DELETE — MANAGER ONLY
-- =====================================================

drop policy if exists "bazaar_delete_self_or_manager"
on public.bazaar_entries;

drop policy if exists "bazaar_delete_manager"
on public.bazaar_entries;


create policy "bazaar_delete_manager"
on public.bazaar_entries
for delete
using (
  public.is_mess_manager(mess_id)
);


-- =====================================================
-- 13. BAZAAR ITEM DELETE — MANAGER ONLY
-- =====================================================

drop policy if exists "bazaar_items_delete_owner"
on public.bazaar_items;

drop policy if exists "bazaar_items_delete_manager"
on public.bazaar_items;


create policy "bazaar_items_delete_manager"
on public.bazaar_items
for delete
using (
  exists (
    select 1
    from public.bazaar_entries entry
    where entry.id = bazaar_items.entry_id
      and public.is_mess_manager(entry.mess_id)
  )
);


-- =====================================================
-- 14. REMOVE OLD DIRECT LEAVE FUNCTION
-- =====================================================

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace
      on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'leave_mess'
  ) then
    revoke execute
    on function public.leave_mess(uuid)
    from authenticated;

    revoke execute
    on function public.leave_mess(uuid)
    from anon;

    revoke execute
    on function public.leave_mess(uuid)
    from public;
  end if;
end;
$$;


drop function if exists public.leave_mess(uuid) cascade;


-- =====================================================
-- 15. MANAGER-APPROVED MEMBER REMOVAL
-- =====================================================

create or replace function public.remove_member_from_mess(
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.members;
  v_manager_count integer;
  v_owner_id uuid;
  v_new_owner_id uuid;
begin
  -- Target member খুঁজবে

  select *
  into v_target
  from public.members
  where id = p_member_id
    and is_active = true;


  if v_target.id is null then
    raise exception
      'Active member not found.';
  end if;


  -- শুধু manager member remove করতে পারবে

  if not public.is_mess_manager(v_target.mess_id) then
    raise exception
      'Only a manager can remove a member.';
  end if;


  -- Manager নিজেকে remove করতে পারবে না

  if v_target.user_id = auth.uid() then
    raise exception
      'You cannot remove yourself. Another manager must approve this action.';
  end if;


  -- Last manager remove করা যাবে না

  if v_target.role = 'manager' then
    select count(*)
    into v_manager_count
    from public.members
    where mess_id = v_target.mess_id
      and role = 'manager'
      and user_id is not null
      and is_active = true;


    if v_manager_count <= 1 then
      raise exception
        'A mess must always have at least one manager.';
    end if;
  end if;


  -- Target member Mess owner হলে ownership transfer করবে

  select owner_id
  into v_owner_id
  from public.messes
  where id = v_target.mess_id;


  if v_owner_id = v_target.user_id then
    select user_id
    into v_new_owner_id
    from public.members
    where mess_id = v_target.mess_id
      and role = 'manager'
      and user_id is not null
      and user_id <> v_target.user_id
      and is_active = true
    order by joined_at
    limit 1;


    if v_new_owner_id is null then
      raise exception
        'Assign another manager before removing the owner.';
    end if;


    update public.messes
    set owner_id = v_new_owner_id
    where id = v_target.mess_id;
  end if;


  -- Member-এর পুরোনো data delete হবে না
  -- শুধু active membership বন্ধ হবে

  update public.members
  set
    user_id = null,
    role = 'member',
    is_active = false
  where id = v_target.id;
end;
$$;


-- =====================================================
-- 16. REMOVE FUNCTION PERMISSION
-- =====================================================

revoke all
on function public.remove_member_from_mess(uuid)
from public;


grant execute
on function public.remove_member_from_mess(uuid)
to authenticated;


-- =====================================================
-- 17. RECEIPT DELETE — MANAGER ONLY
-- =====================================================

drop policy if exists "receipts_delete_owner"
on storage.objects;

drop policy if exists "receipts_delete_manager"
on storage.objects;


create policy "receipts_delete_manager"
on storage.objects
for delete
using (
  bucket_id = 'bazaar-receipts'

  and public.is_mess_manager(
    ((storage.foldername(name))[1])::uuid
  )
);


-- =====================================================
-- 18. UPDATE JOIN FUNCTION TO CHECK ACTIVE MEMBER
-- =====================================================

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
    raise exception
      'You must be signed in.';
  end if;


  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception
      'Member name is required.';
  end if;


  select *
  into v_mess
  from public.messes
  where code = upper(trim(p_code));


  if v_mess.id is null then
    raise exception
      'No mess found with this code.';
  end if;


  select *
  into v_member
  from public.members
  where members.mess_id = v_mess.id
    and members.user_id = v_user_id
    and members.is_active = true;


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
    role,
    is_active
  )
  values (
    v_mess.id,
    v_user_id,
    trim(p_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'member',
    true
  )
  returning *
  into v_member;


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


revoke all
on function public.join_mess_by_code(
  text,
  text,
  text,
  text
)
from public;


grant execute
on function public.join_mess_by_code(
  text,
  text,
  text,
  text
)
to authenticated;


-- =====================================================
-- 19. RELOAD SUPABASE REST SCHEMA
-- =====================================================

notify pgrst, 'reload schema';


-- =====================================================
-- 20. VERIFY COLUMN
-- =====================================================

select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'members'
  and column_name = 'is_active';