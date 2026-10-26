-- Mille feed 实时推送补丁(已执行 schema.sql 的项目再执行)
-- 内容:把 posts 表加入 supabase_realtime 发布
-- (前端 postgres_changes INSERT 事件订阅依赖它;RLS 仍然生效,只推送用户可见的行)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- 让 PostgREST 重新加载 schema 缓存
notify pgrst, 'reload schema';
