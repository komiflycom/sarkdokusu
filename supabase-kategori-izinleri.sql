-- Şark Dokusu: ziyaretçilerin (anon) kategorileri okuyabilmesi için.
-- Supabase > SQL Editor'de bir kez çalıştırın.
alter table public.categories enable row level security;
drop policy if exists "Herkes aktif kategorileri okuyabilir" on public.categories;
create policy "Herkes aktif kategorileri okuyabilir"
  on public.categories for select to anon, authenticated
  using (true);
grant select on public.categories to anon, authenticated;
