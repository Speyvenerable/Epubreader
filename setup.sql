-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.downloads (
  file  text primary key,
  count bigint not null default 0
);

alter table public.downloads enable row level security;

-- Anyone may read the counts.
drop policy if exists "read counts" on public.downloads;
create policy "read counts" on public.downloads
  for select using (true);

-- Anyone may add one download, but only through this function.
create or replace function public.increment_download(f text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.downloads (file, count)
  values (left(f, 200), 1)
  on conflict (file) do update set count = public.downloads.count + 1;
$$;

revoke all on function public.increment_download(text) from public;
grant execute on function public.increment_download(text) to anon, authenticated;
