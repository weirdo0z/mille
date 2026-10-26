-- Mille 个人资料扩展补丁(已执行 schema.sql 的项目,再执行本文件)
-- 内容:profiles 增加 都道府县/入学日;创建头像存储桶 avatars

-- ============ profiles 扩展字段 ============
alter table public.profiles add column if not exists prefecture text not null default '東京';
alter table public.profiles add column if not exists school_started_at date;

-- ============ avatars 存储桶(公开读,只能写自己的目录) ============
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
