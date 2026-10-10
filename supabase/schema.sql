-- Mille 初始 schema(粘贴到 Supabase SQL Editor 执行)
-- 用途: Phase 1 最小数据流 — 账号(profiles)/ 帖子(posts)/ 点赞(likes)/ 贴纸(stickers, user_stickers)

create extension if not exists "pgcrypto";

-- ============ profiles:每个 auth 用户一行 ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles select" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- 注册时自动建 profile(username/display_name 取自 signUp 的 options.data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ posts:公开 feed ============
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text not null default '',
  place_name text not null default '',
  sticker_name text not null default '',
  tone text not null default 'lavender',
  likes_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_feed_idx on public.posts(created_at desc, id desc);

alter table public.posts enable row level security;

create policy "posts select" on public.posts for select using (true);
create policy "posts insert own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts delete own" on public.posts for delete using (auth.uid() = user_id);
-- 注意:posts 不给 update 权限;likes_count 只通过 toggle_like RPC 维护

-- ============ likes:PK(post_id, user_id) ============
create table if not exists public.likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "likes select" on public.likes for select using (true);
-- 插入/删除只走 toggle_like RPC(security definer),不给直接写权限

-- 点赞/取消点赞原子操作:返回操作后是否已赞
create or replace function public.toggle_like(p_post_id bigint)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  select exists(select 1 from public.likes where post_id = p_post_id and user_id = v_user) into v_exists;
  if v_exists then
    delete from public.likes where post_id = p_post_id and user_id = v_user;
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = p_post_id;
    return false;
  else
    insert into public.likes(post_id, user_id) values (p_post_id, v_user);
    update public.posts set likes_count = likes_count + 1 where id = p_post_id;
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_like(bigint) to authenticated;

-- ============ stickers:贴纸目录(服务端驱动) ============
create table if not exists public.stickers (
  id bigint generated always as identity primary key,
  name text unique not null,
  emoji text not null default '✦',
  label text not null default '',
  sub text not null default '',
  color text not null default '#dcd5fa',
  art_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.stickers enable row level security;

create policy "stickers select" on public.stickers for select using (true);
-- 只有运营(service_role)能写;client 端无写权限

-- 种子贴纸(与现有设计稿的 6 个一致)
insert into public.stickers (name, emoji, label, sub, color) values
  ('afterschool-cafe', '☕', '放課後', 'カフェめぐり', '#f9d7c8'),
  ('youth-rooftop',   '✦',  '青春',   '屋上の空',     '#dcd5fa'),
  ('trip-enoshima',   '♨',  '遠足',   '江ノ島さんぽ', '#c8e7e0'),
  ('summer-festival', '☼',  '夏祭り', '花火の夜',     '#f5e2a7'),
  ('music-room',      '♪',  '音楽室', '文化祭前夜',   '#e8c9e4'),
  ('first-memory',    '♡',  'はじめて', 'Mille記念',  '#f5b7c6')
on conflict (name) do nothing;

-- ============ user_stickers:图鉴(收集记录) ============
create table if not exists public.user_stickers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sticker_id bigint not null references public.stickers(id) on delete cascade,
  source text not null default 'manual',
  acquired_at timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

alter table public.user_stickers enable row level security;

create policy "user_stickers select" on public.user_stickers for select using (true);
create policy "user_stickers insert own" on public.user_stickers for insert with check (auth.uid() = user_id);
-- 说明: Phase 3 上线位置签到/QR 后,这里会改成 verify-geofence 等 edge function 调用
-- service_role 发放,移除直接 insert 权限。当前仅用于联调。
