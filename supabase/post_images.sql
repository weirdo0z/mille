-- Mille 发帖图片 + 贴纸 emoji 补丁(已执行 schema.sql 的项目再执行)
-- 内容:posts 增加 sticker_emoji 列;创建 post-images 存储桶(公开读,只能写自己的目录)

-- ============ posts 增加贴纸 emoji ============
alter table public.posts add column if not exists sticker_emoji text not null default '✦';

-- ============ post-images 存储桶 ============
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post-images read" on storage.objects;
create policy "post-images read" on storage.objects for select using (bucket_id = 'post-images');

drop policy if exists "post-images insert own" on storage.objects;
create policy "post-images insert own" on storage.objects for insert
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images update own" on storage.objects;
create policy "post-images update own" on storage.objects for update
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images delete own" on storage.objects;
create policy "post-images delete own" on storage.objects for delete
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 让 PostgREST 重新加载 schema 缓存(新列/新桶立即生效)
notify pgrst, 'reload schema';
