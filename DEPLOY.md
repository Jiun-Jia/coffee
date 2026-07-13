# 部署指南（Supabase Cloud + Vercel）

> 對應 M3-PLAN 的 DB-13 / SETUP-9 / VIZ-15。以下帳號建立與授權步驟需要專案擁有者親自操作，之後的 CLI 指令可交給 Claude 執行。

## 1. Supabase Cloud 專案（DB-13）

1. 到 [supabase.com](https://supabase.com) 註冊/登入，**New project**：
   - Region 選 **Northeast Asia (Tokyo)**（D10）
   - Database password 記下來（migration 推送會用到）
2. 取得金鑰：Dashboard → Settings → API：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key`（或 legacy anon key）→ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Secret key`（或 legacy service_role）→ `SUPABASE_SERVICE_ROLE_KEY`
3. 推送 schema（在 WSL 或任何有 supabase CLI 的環境）：

   ```bash
   supabase login                 # 開瀏覽器授權
   supabase link --project-ref <ref>   # ref 在 Dashboard URL 可見
   supabase db push               # 套用全部 migrations
   ```

4. 匯入內建風味標籤（seed 不會隨 push 執行）：
   Dashboard → SQL Editor → 貼上 `supabase/seed.sql` 內容執行（冪等，可重跑）。
5. Auth 設定：Dashboard → Authentication → URL Configuration：
   - Site URL：`https://<your-app>.vercel.app`
   - Redirect URLs 加入：`https://<your-app>.vercel.app/auth/confirm`
   - Providers → Email：**關閉** "Confirm email"（D1，正式開放朋友用再開）

## 2. Vercel 專案（SETUP-9）

1. 到 [vercel.com](https://vercel.com) 用 GitHub 登入 → **Add New Project** → import 這個 repo。
2. Framework 自動偵測 Next.js；Root Directory 保持 repo 根目錄。
3. Environment Variables（Production + Preview）：

   | 變數 | 值 | 曝險 |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 步驟 1-2 的 URL | 公開無妨 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key | 公開無妨（受 RLS） |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret key | **僅 server**，絕不進前端 |
   | `CRON_SECRET` | 隨機長字串（`openssl rand -hex 32`） | 保活 cron 驗證 |

4. Deploy。Function region 建議東京（`hnd1`，Project Settings → Functions）。
5. `vercel.json` 已含每日保活 cron（`/api/keepalive`，UTC 01:00）；Vercel 會自動帶 `Authorization: Bearer $CRON_SECRET`。

## 3. 上線驗收清單（VIZ-15）

- [ ] `https://<app>.vercel.app` 可開，未登入被導向 /login
- [ ] 註冊新帳號（唯一 username 檢查有效）→ 自動登入進 Dashboard
- [ ] 建豆 → 記一杯（自動計算正確）→ 列表/詳情/編輯/複製/刪除
- [ ] 風味標籤：選內建、建自訂、提交建議
- [ ] 分析頁四張圖有資料且可套篩選
- [ ] 設定頁：改 username、磨豆機/標籤管理、CSV 匯出（Excel 開啟不亂碼）
- [ ] **雙帳號 RLS 互測**：第二個帳號看不到第一個帳號的任何資料
- [ ] 手機（375px）實測：表單可完成、列表為卡片
- [ ] 忘記密碼信寄達且連結可重設（需先設定 SMTP 或用 Supabase 內建額度）
- [ ] Vercel → Cron Jobs 顯示 keepalive 執行成功

## 4. 日常維運

- Schema 變更 SOP：`supabase migration new ...` → 本機 `db reset` + RLS 測試 → `gen types` → commit → `supabase db push`
- 手動備份：設定頁匯出 CSV；或 `supabase db dump`（Free 方案無自動備份）
- 升級觸發點見 TECH.md §3.3
