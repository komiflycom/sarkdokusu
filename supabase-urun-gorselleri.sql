-- Şark Dokusu: ürün başına birden fazla fotoğraf.
-- Supabase > SQL Editor'de bir kez çalıştırın.
alter table public.products add column if not exists image_url_2 text;
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

-- Mevcut ürünlerin ana + 2. fotoğrafını yeni listeye aktar (yalnızca boş olanlar).
update public.products
set images = to_jsonb(array_remove(array[image_url, image_url_2], null))
where images = '[]'::jsonb
  and (image_url is not null or image_url_2 is not null);
