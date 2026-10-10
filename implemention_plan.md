# Mille 生产化实施计划 (Production Roadmap)

> 版本: 0.1(草案)/ 2026-10-10
> 前提文档: concept.md(仕様・世界観・ビジネスモデル)
> 対象コード: 本仓库 mille(Tauri 2 + Preact + TypeScript + Tailwind 4)

## 0. 决策摘要(已确认)

| 项目 | 决策 |
| --- | --- |
| 目标平台 | iOS + Android 手机 App(Tauri 2 mobile);桌面仅作开发预览 |
| 后端 | Supabase(Postgres + Auth + Storage + Edge Functions + Realtime) |
| 前端 | 保持 Preact + TypeScript + Tailwind 4 |
| 定位 | 日本高校生向け体験型 SNS「Mille(ミル)」 |

## 1. 现状与差距

已实现(设计稿迁移 + 交互):

- 四个页面:信息流(home)/ 探索(discover)/ 图鉴(profile)/ マイページ(mypage)+ 底部导航
- 交互:页面切换、点赞、收藏、发帖弹窗(追加到 feed)、Header 搜索跳转
- 视觉:日系可爱风,430px 手机版式(桌面窗口 430×932 模拟)

与生产的差距:

- 无后端:数据全部 mock(`src/data.ts`,内存态,重启即失)
- 无账号体系:登录 / 注册 / 资料 / 关注
- 无真实媒体:拍照 / 选图 / 压缩 / 上传 / 存储
- 贴纸系统仅静态展示:无目录、无获取方式(位置 / QR)、图鉴不持久
- 无移动端能力:相机 / 相册 / 定位 / 深链 / 推送 / 分享
- 无合规与审核:利用規約、未成年保护、内容举报
- 无运营后台、无监控、无 CI/CD

## 2. 目标架构

```
┌─ 客户端(App)────────────────────────────┐
│ Preact + TypeScript + Tailwind           │
│ 状态: @preact/signals;API: supabase-js   │
│ 发帖流水线: 拍照/选图 → 压缩 → 贴纸合成   │
├─ Tauri native 层(仅手机必需能力)──────────┤
│ 定位(geolocation)/ 深链(deep-link)/       │
│ 本地通知 / 相册 / 分享(方案待 spike)      │
└──────────────┬───────────────────────────┘
               │ HTTP + Realtime(WS)
┌─ 后端(Supabase)─────────────────────────┐
│ Auth(email/phone + 密码)                  │
│ Postgres + RLS(行级安全,全表开启)         │
│ Storage: 头像 / 投稿图片(public bucket)   │
│ Edge Functions(服务端校验,防作弊):        │
│   verify-geofence(位置签到)              │
│   claim-qr(一次性/限量 QR 码)            │
│ Realtime: feed 新帖 / 通知(P2)           │
└──────────────────────────────────────────┘
```

- 相机:优先 WebView `getUserMedia`(iOS WKWebView / Android WebView 均可用),不够再评估原生插件(验证点)
- 远端推送:FCM/APNs 桥接为验证点;MVP 先用本地通知 + 应用内通知
- 环境:local(Supabase CLI)/ staging / production 三套

## 3. 数据模型(草案)

| 表 | 关键列 | 说明 |
| --- | --- | --- |
| profiles | id(=auth.users), username(unique), display_name, avatar_url, bio, prefecture, is_minor, guardian_consent_at | 公开资料 |
| posts | id, user_id, image_url, caption, place_name, lat, lng, sticker_ids[], likes_count, created_at | 投稿 |
| stickers | id, name, art_url, emoji, rarity, venue_id, active, starts_at/ends_at | 贴纸目录(服务端驱动) |
| user_stickers | PK(user_id, sticker_id), acquired_at, source(geofence/qr/event) | 图鉴(收集记录) |
| venues | id, name, lat, lng, radius_m, sticker_ids[], contract_status | 赞助店铺/活动 |
| likes | PK(post_id, user_id), created_at | 点赞 |
| comments | id, post_id, user_id, body, created_at | 评论 |
| follows | PK(follower_id, followee_id) | 关注 |
| reports | id, reporter_id, post_id?, user_id?, reason, status, reviewed_by | 举报与审核 |
| qr_claims | id, code(unique), sticker_id, venue_id, max_uses, used_count, expires_at | 线下 QR 码 |
| notifications | id, user_id, type, actor_id, post_id?, read | 通知 |

要点:

- 全表 RLS:用户只能写自己的数据;feed 公开读
- 位置信息仅存于帖子与签到,不做轨迹采集(隐私最小化,个人情報保护法对应)
- `likes_count` 反规范化,先用应用层维护,量大了再上 trigger

## 4. 阶段计划

### Phase 1 — 数据层与账号

- 建 Supabase 项目 + schema + RLS;local 环境(Supabase CLI)
- `src/data.ts` mock → API 替换;帖子 / 用户资料真实读写
- 登录 / 注册 / 资料编辑 / 退出(现有「ログアウト」按钮接上)
- 验收:新账号注册 → 发帖 → 重启 app 后数据仍在

### Phase 2 — 核心闭环

- 发帖:相册选图 / 拍照 + 压缩上传 + 发布
- feed 分页 + 下拉刷新;点赞 / 收藏 / 评论落库;关注 + 通知
- 验收:双账号互关、互赞、互评全链路可用(此阶段ビジコン demo 即可成型)

### Phase 3 — 贴纸系统(核心差异点)

- stickers 目录管理接口;图鉴页接真实数据
- 获取方式:位置签到(geofence,服务端校验)+ QR claim
- 防作弊:距离容差、获取冷却、频控、每人每贴纸限一次;GPS 不佳的室内店铺用店员 QR 兜底
- 验收:到指定坐标 50m 内签到获得贴纸;伪造坐标被服务端拒绝

### Phase 4 — 装饰与分享

- 发帖时贴纸选择器(替换现在的文字输入)
- canvas 合成:照片 + 贴纸 + Mille logo + QR(深链)→ 导出图片
- share sheet 分享(含 Instagram 導線);导出图即扩散素材
- SNOW 级 AR 滤镜单独评估,列为 Phase 4.5 / P2(工作量大,不阻塞上线)

### Phase 5 — 移动端适配

- Tauri 2 mobile 跑通:Android(Windows 可构建)+ iOS(需 macOS/Xcode)
- 相机 / 相册 / 定位 / 深链 / 通知权限接入;safe area 适配
- 图标、启动屏、商店元数据
- 验收:真机安装,拍照 → 贴纸 → 发帖 → QR 深链全流程

### Phase 6 — 运营与变现基础

- venue 管理后台(轻量 web 管理端):登录、贴纸发布、QR 码生成、来店统计
- Discover 赞助位与贴纸活动展示;feed 原生广告位(P2)
- 验收:运营方自助创建限定贴纸并生成 100 枚 QR 码

### Phase 7 — 合规与内容安全(与 P2 起并行,上线前完成)

- 利用規約・プライバシーポリシー(个人情报保护法对应)
- 未成年:年龄确认(13+)、未满 18 保护者同意流程并留记录
- 内容审核:举报 → 人工审核 → 处理(删除/封禁);被举报 N 次自动隐藏;后续接入图像筛查 API(验证点)
- App Store 审核要件(UGC):举报、拉黑、审核机制、联系方式齐备
- 验收:审核清单逐项通过,Apple 审核无驳回

### Phase 8 — 发布与运维

- TestFlight / Google Play 封闭测试
- CI/CD:GitHub Actions(Android 于 Linux runner;iOS 需 macOS runner 或本地 Mac)
- 崩溃监控、分析、错误追踪(选型待定)
- 备份/恢复、成本预算、告警

## 5. 风险与对策

| 风险 | 对策 |
| --- | --- |
| iOS 构建需 macOS | 采购/借用 Mac,或云构建;前期 Android 先行验证,iOS 后补 |
| Tauri mobile 插件成熟度(相机/分享/推送) | 每项能力先做 spike 验证,不行退回 WebView API 或原生桥接 |
| 位置作弊刷贴纸 | 服务端校验 + 冷却 + 频控;店员 QR 兜底;贴纸无金钱价值压低诱因 |
| 未成年内容安全(CSAM,App Store 重点审查) | 举报 + 人工审核先行;后续自动筛查;随规模提升账号实名度 |
| Supabase 依赖 / 成本 | 标准 Postgres 可导出,保留自建迁移路径;额度监控告警 |
| 「Mille」商标 / App 名冲突 | 上线前做商标调查与商店检索(行动项) |
