create table public.user_workbooks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workbook_data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_workbooks_data_is_object check (jsonb_typeof(workbook_data) = 'object')
);

alter table public.user_workbooks enable row level security;

revoke all on table public.user_workbooks from anon, authenticated;
grant select, insert, update, delete on table public.user_workbooks to authenticated;

create policy "Users can read their own workbook"
  on public.user_workbooks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workbook"
  on public.user_workbooks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workbook"
  on public.user_workbooks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own workbook"
  on public.user_workbooks for delete to authenticated
  using ((select auth.uid()) = user_id);

create index user_workbooks_updated_at_idx on public.user_workbooks (updated_at);
