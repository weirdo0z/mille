# Mille 生产化实施计划 (Production Roadmap)

> 版本: 0.3(2026-10-10 更新:Phase 2 完成)
> 前提文档: concept.md(仕様・世界観・ビジネスモデル)
> 対象コード: 本仓库 mille(Tauri 2 + Preact + TypeScript + Tailwind 4)

## 0. 决策摘要(已确认)

| 项目 | 决策 |
| --- | --- |
| 目标平台 | iOS + Android 手机 App(Tauri 2 mobile);桌面仅作开发预览 |
| 后端 | Supabase(Postgres + Auth + Storage + Edge Functions + Realtime) |
| 前端 | 保持 Preact + TypeScript + Tailwind 4 |
| 定位 | 日本高校生向け体験型 SNS「Mille(ミル)」 |

## 1. 现状与差距(2026-10-10 更新)

已实现(设计稿迁移 + Supabase 接入 + 核心交互):

- 四个页面:信息流(home)/ 探索(discover)/ 图鉴(profile)/ マイページ(mypage)+ 底部导航
- 账号体系:Supabase Auth(邮箱+密码)注册 / 登录 / 登出;注册时收集 用户名 / 表示名 / 都道府县 / 入学年月;启动时恢复会话;老账号缺 profile 行时自动补建
- 个人资料:profiles 真实读写(头像上传 avatars 桶、用户名、表示名、都道府县、入学日);「高校生活 N日目」由入学日实时计算
- 发帖:相机(`<input capture="environment">`,手机直调相机,桌面降级为文件选择)/ 相册选图 → 上传 post-images 桶 → posts 落库;贴纸从目录 dropdown 选择(emoji + 名称);色调(ラベンダー / コーラル)
- feed「みんなの体験」:分页(10 条/页,id 游标)+ 无限滚动 + 下拉刷新 + 刷新按钮 + 新帖 Realtime 自动上墙 + 错误横幅(可重试);自己的最新投稿单独查询后合并,保证不丢
- 点赞:乐观更新 + `toggle_like` RPC(服务端原子维护 likes 行与 likes_count)
- 图鉴:stickers 目录 + user_stickers 收集状态(已收集 / 未獲得)、STICKER BOOK 进度条全部真实数据
- マイページ:真实投稿数与「わたしの投稿」网格(含贴纸徽章);投稿后即时同步
- 轻量 toast 提示系统(`src/lib/toast.ts` + Toaster)
- 全站 demo 回退:未配置 `.env` 时以 mock 数据运行,`bun run dev` 永不中断

与生产的差距(剩余):

- 评论 / 关注 / 通知 / 收藏落库(feed 上收藏按钮目前仅本地状态)
- 贴纸获取机制:位置签到(geofence)/ QR claim
- canvas 装饰合成:照片 + 贴纸 + Mille logo + QR 导出
- 图片压缩(上传前)
- 移动端能力:定位 / 深链 / 推送 / 分享(Tauri native)
- 合规与审核、运营后台、CI/CD、监控

## 2. 目标架构

```
┌─ 客户端(App)────────────────────────────┐
│ Preact + TypeScript + Tailwind           │
│ 状态: preact hooks + 自定义 useFeed hook  │
│ API: supabase-js                         │
│ 发帖流水线: 拍照/选图 → 上传 → 贴纸选择   │
├─ Tauri native 层(仅手机必需能力)──────────┤
│ 定位(geolocation)/ 深链(deep-link)/       │
│ 本地通知 / 相册 / 分享(方案待 spike)      │
└──────────────┬───────────────────────────┘
               │ HTTP + Realtime(WS)
┌─ 后端(Supabase)─────────────────────────┐
│ Auth(email + 密码)                       │
│ Postgres + RLS(行级安全,全表开启)         │
│ Storage: avatars / post-images(public)   │
│ RPC: toggle_like(点赞原子操作)            │
│ Realtime: posts INSERT 推送 feed         │
│ Edge Functions(P3,服务端校验防作弊):      │
│   verify-geofence(位置签到)              │
│   claim-qr(一次性/限量 QR 码)            │
└──────────────────────────────────────────┘
```

- 相机:已用 WebView 方案 `<input capture="environment">` 跑通;原生插件按需再评估
- 远端推送:FCM/APNs 桥接为验证点;MVP 先用本地通知 + 应用内通知
- 环境:当前直接使用云端项目开发;local(Supabase CLI)/ staging 三套环境待建

## 3. 数据模型

已建(见 `supabase/schema.sql`):

| 表 | 关键列 | 说明 |
| --- | --- | --- |
| profiles | id(=auth.users), username(unique), display_name, avatar_url, bio, prefecture, school_started_at, created_at | 公开资料;注册触发器自动建行 |
| posts | id(bigint identity), user_id, image_url, caption, place_name, sticker_name, sticker_emoji, tone, likes_count, created_at | 投稿 |
| stickers | id, name(unique), emoji, label, sub, color, art_url, active, created_at | 贴纸目录(服务端驱动) |
| user_stickers | PK(user_id, sticker_id), source, acquired_at | 图鉴(收集记录) |
| likes | PK(post_id, user_id), created_at | 点赞 |

待建(草案):

| 表 | 关键列 | 说明 |
| --- | --- | --- |
| venues | id, name, lat, lng, radius_m, sticker_ids[], contract_status | 赞助店铺/活动(P3) |
| comments | id, post_id, user_id, body, created_at | 评论(P2 剩余) |
| follows | PK(follower_id, followee_id) | 关注(P2 剩余) |
| reports | id, reporter_id, post_id?, user_id?, reason, status, reviewed_by | 举报与审核(P7) |
| qr_claims | id, code(unique), sticker_id, venue_id, max_uses, used_count, expires_at | 线下 QR 码(P3) |
| notifications | id, user_id, type, actor_id, post_id?, read | 通知(P2 剩余) |

要点:

- 全表 RLS:用户只能写自己的数据;feed 公开读
- 点赞只走 `toggle_like` RPC(security definer),likes_count 由 RPC 原子维护
- 头像 / 发帖图片分别存 `avatars` / `post-images` 桶(公开读,只能写自己的 `{user_id}/` 目录)
- 位置信息仅存于帖子与签到,不做轨迹采集(隐私最小化);位置暂为文本(place_name),P3 再加 lat/lng
- posts 读取**不用 PostgREST 关系 embed**(在部分 DB 上因 schema cache 报错,已踩坑),改为 client-side join:posts → 收集 user_id → profiles 批量查询 → 合并

SQL 迁移文件(按顺序打补丁;新项目只需跑 `schema.sql`):

1. `supabase/schema.sql` — 全量(表 + RLS + 触发器 + toggle_like + 种子贴纸 + 两个存储桶 + realtime 发布)
2. `supabase/profile_v2.sql` — profiles 扩展字段 + avatars 桶(老项目补丁)
3. `supabase/profile_v3.sql` — 注册触发器写入 prefecture/school_started_at(老项目补丁)
4. `supabase/post_images.sql` — posts.sticker_emoji 列 + post-images 桶(老项目补丁)
5. `supabase/realtime.sql` — posts 加入 supabase_realtime 发布(老项目补丁)
6. `supabase/p2_rest.sql` — P2 残り(保存/コメント/フォロー/通知 + comments_count)(老项目补丁)

## 4. 阶段计划

### Phase 1 — 数据层与账号 ✅ 完成

- ~~建 Supabase 项目 + schema + RLS;local 环境(Supabase CLI)~~(云端项目直接使用;local 环境未建,延后)
- ✅ mock → API 替换:帖子 / 用户资料真实读写
- ✅ 登录 / 注册 / 资料编辑 / 退出;注册即收集资料问题
- 验收:新账号注册 → 发帖 → 重启 app 后数据仍在 ✅

### Phase 2 — 核心闭环 ✅ 完成(2026-10-10)

- ✅ 发帖:相册选图 / 拍照 + 压缩上传 + 发布
- ✅ feed 分页 + 下拉刷新 + 无限滚动 + Realtime 新帖 + 错误横幅
- ✅ 点赞落库(乐观更新 + `toggle_like` RPC)
- ✅ 评论:`comments` 表 + `add_comment` RPC(原子维护 comments_count)+ 评论弹窗
- ✅ 关注:`follows` 表;PostCard フォローボタン;マイページのフォロワー/フォロー中を実数表示
- ✅ 通知:`notifications` 表 + 触发器(follow/like/comment 自动通知)+ 铃铛未读バッジ + 通知面板 + Realtime 即时更新 + 既读化
- ✅ 收藏落库:`saves` 表 + 乐观更新
- ✅ 图片上传前压缩(长边 1600px / JPEG q0.85;GIF 原样)
- 验收:双账号互关、互赞、互评全链路可用(ビジコン demo 成型)

已知限界(后续处理):いいね解除・コメント削除時に通知/计数不回溯;通知重复(连打いいね)未去重

### Phase 3 — 贴纸系统(核心差异点)🔄 部分完成

已完成:

- ✅ stickers 目录管理(服务端驱动)
- ✅ 图鉴页接真实数据(已收集 / 未獲得 + 进度条)

剩余:

- ⬜ 获取方式:位置签到(geofence,服务端校验)+ QR claim
- ⬜ 防作弊:距离容差、获取冷却、频控、每人每贴纸限一次;GPS 不佳的室内店铺用店员 QR 兜底
- 验收:到指定坐标 50m 内签到获得贴纸;伪造坐标被服务端拒绝

### Phase 4 — 装饰与分享 🔄 部分完成

已完成:

- ✅ 发帖时贴纸选择器(dropdown,emoji + 名称)

剩余:

- ⬜ canvas 合成:照片 + 贴纸 + Mille logo + QR(深链)→ 导出图片
- ⬜ share sheet 分享(含 Instagram 導線);导出图即扩散素材
- ⬜ SNOW 级 AR 滤镜单独评估,列为 Phase 4.5 / P2(工作量大,不阻塞上线)

### Phase 5 — 移动端适配 ⬜ 未开始

- Tauri 2 mobile 跑通:Android(Windows 可构建)+ iOS(需 macOS/Xcode)
- 相机 / 相册 / 定位 / 深链 / 通知权限接入;safe area 适配
- 图标、启动屏、商店元数据
- 验收:真机安装,拍照 → 贴纸 → 发帖 → QR 深链全流程

### Phase 6 — 运营与变现基础 ⬜ 未开始

- venue 管理后台(轻量 web 管理端):登录、贴纸发布、QR 码生成、来店统计
- Discover 赞助位与贴纸活动展示;feed 原生广告位(P2)
- 验收:运营方自助创建限定贴纸并生成 100 枚 QR 码

### Phase 7 — 合规与内容安全(与 P2 起并行,上线前完成)⬜ 未开始

- 利用規約・プライバシーポリシー(个人情报保护法对应)
- 未成年:年龄确认(13+)、未满 18 保护者同意流程并留记录
- 内容审核:举报 → 人工审核 → 处理(删除/封禁);被举报 N 次自动隐藏;后续接入图像筛查 API(验证点)
- App Store 审核要件(UGC):举报、拉黑、审核机制、联系方式齐备
- 验收:审核清单逐项通过,Apple 审核无驳回

### Phase 8 — 发布与运维 ⬜ 未开始

- TestFlight / Google Play 封闭测试
- CI/CD:GitHub Actions(Android 于 Linux runner;iOS 需 macOS runner 或本地 Mac)
- 崩溃监控、分析、错误追踪(选型待定)
- 备份/恢复、成本预算、告警

## 5. 风险与对策

| 风险 | 对策 |
| --- | --- |
| PostgREST 关系 embed 不稳定(已踩坑:feed 带 `profiles(...)` embed 时部分 DB 上查询失败,表现为投稿不显示) | 已改为 client-side join;insert/select 一律不带 embed |
| iOS 构建需 macOS | 采购/借用 Mac,或云构建;前期 Android 先行验证,iOS 后补 |
| Tauri mobile 插件成熟度(相机/分享/推送) | 每项能力先做 spike 验证,不行退回 WebView API 或原生桥接 |
| 位置作弊刷贴纸 | 服务端校验 + 冷却 + 频控;店员 QR 兜底;贴纸无金钱价值压低诱因 |
| 未成年内容安全(CSAM,App Store 重点审查) | 举报 + 人工审核先行;后续自动筛查;随规模提升账号实名度 |
| Supabase 依赖 / 成本 | 标准 Postgres 可导出,保留自建迁移路径;额度监控告警 |
| 「Mille」商标 / App 名冲突 | 上线前做商标调查与商店检索(行动项) |
