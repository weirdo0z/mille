-- Mille P2 残り機能(保存 / コメント / フォロー / 通知)パッチ
-- 既存プロジェクトは本ファイルを SQL Editor で実行

-- ---------- posts にコメント数カウンタ ----------
alter table public.posts add column if not exists comments_count bigint not null default 0;

-- ---------- saves: 保存(ブックマーク) ----------
create table if not exists public.saves (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.saves enable row level security;
create policy "saves select own" on public.saves for select using (auth.uid() = user_id);
create policy "saves insert own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves delete own" on public.saves for delete using (auth.uid() = user_id);

-- ---------- comments: コメント ----------
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments(post_id, id);

alter table public.comments enable row level security;
create policy "comments select" on public.comments for select using (true);
create policy "comments delete own" on public.comments for delete using (auth.uid() = user_id);
-- コメント挿入は add_comment RPC のみ許可(comments_count の整合性維持)

-- コメント追加 RPC: コメント挿入 + comments_count 原子更新
create or replace function public.add_comment(p_post_id bigint, p_body text)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id bigint;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if length(trim(p_body)) = 0 then raise exception 'empty comment'; end if;
  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'post not found';
  end if;
  insert into public.comments (post_id, user_id, body)
  values (p_post_id, v_user, trim(p_body))
  returning id into v_id;
  update public.posts set comments_count = comments_count + 1 where id = p_post_id;
  return v_id;
end;
$$;

grant execute on function public.add_comment(bigint, text) to authenticated;

-- ---------- follows: フォロー ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;
create policy "follows select" on public.follows for select using (true);
create policy "follows insert own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete own" on public.follows for delete using (auth.uid() = follower_id);

-- ---------- notifications: 通知 ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,               -- follow / like / comment
  actor_id uuid references public.profiles(id) on delete cascade,
  post_id bigint references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, id desc);

alter table public.notifications enable row level security;
create policy "notifications select own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications for update using (auth.uid() = user_id);
-- 通知はトリガー経由でのみ作成(クライアント直接 insert 不可)

-- フォロー通知
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id)
  values (new.followee_id, 'follow', new.follower_id);
  return new;
end; $$;
drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.notify_on_follow();

-- いいね通知(toggle_like で likes に挿入されても発火する)
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, post_id)
    values (v_owner, 'like', new.user_id, new.post_id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like after insert on public.likes
  for each row execute function public.notify_on_like();

-- コメント通知
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, post_id)
    values (v_owner, 'comment', new.user_id, new.post_id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 通知のリアルタイム配信(バッジ表示用)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
