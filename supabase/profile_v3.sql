-- Mille 注册字段补丁(已执行 schema.sql/profile_v2.sql 的项目再执行)
-- 内容:handle_new_user 触发器改为同时写入 prefecture/school_started_at
-- (函数替换后,已存在的触发器 on_auth_user_created 无需重建,自动用新函数体)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, prefecture, school_started_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce(new.raw_user_meta_data->>'prefecture', '東京'),
    nullif(new.raw_user_meta_data->>'school_started_at', '')::date
  );
  return new;
end;
$$;

-- 让 PostgREST 重新加载 schema 缓存
notify pgrst, 'reload schema';
