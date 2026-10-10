create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.tasks add column user_id uuid;
alter table public.chat_threads add column user_id uuid;

drop policy if exists "tasks_select_all" on public.tasks;
drop policy if exists "tasks_insert_all" on public.tasks;
drop policy if exists "tasks_update_all" on public.tasks;
drop policy if exists "tasks_delete_all" on public.tasks;
create policy "tasks_select_own" on public.tasks for select to authenticated using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert to authenticated with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update to authenticated using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "chat_threads_select_all" on public.chat_threads;
drop policy if exists "chat_threads_insert_all" on public.chat_threads;
drop policy if exists "chat_threads_update_all" on public.chat_threads;
drop policy if exists "chat_threads_delete_all" on public.chat_threads;
create policy "chat_threads_select_own" on public.chat_threads for select to authenticated using (auth.uid() = user_id);
create policy "chat_threads_insert_own" on public.chat_threads for insert to authenticated with check (auth.uid() = user_id);
create policy "chat_threads_update_own" on public.chat_threads for update to authenticated using (auth.uid() = user_id);
create policy "chat_threads_delete_own" on public.chat_threads for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "chat_messages_select_all" on public.chat_messages;
drop policy if exists "chat_messages_insert_all" on public.chat_messages;
drop policy if exists "chat_messages_upsert_all" on public.chat_messages;
drop policy if exists "chat_messages_update_all" on public.chat_messages;
drop policy if exists "chat_messages_delete_all" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "chat_messages_insert_own" on public.chat_messages for insert to authenticated
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "chat_messages_update_own" on public.chat_messages for update to authenticated
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "chat_messages_delete_own" on public.chat_messages for delete to authenticated
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));