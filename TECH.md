# M2 技術決策文件（Tech Decision Record）

| 項目 | 內容 |
|---|---|
| 對應 | PRD.md M2、DESIGN.md |
| 版本 | v1.0（定案） |
| 最後更新 | 2026-07-08 |
| 狀態 | ✅ 已定案 |
| 決策依據 | 使用者選擇：TypeScript + Next.js／Supabase／盡量全免費／公開網路 |

---

## 1. 決策摘要（The Stack）

| 層 | 技術 | 為什麼 |
|---|---|---|
| 前端框架 | **Next.js (App Router) + TypeScript + React** | 生態最大、SSR/路由/伺服器動作內建、與 Supabase/Vercel 整合最佳 |
| 樣式 | **Tailwind CSS** | 快速、無執行期成本、響應式好寫 |
| UI 元件 | **shadcn/ui**（Radix 基底） | 免費、可複製進專案、內含對話框/下拉/表單，剛好對應刪除確認、標籤 combobox |
| 圖表 | **Recharts** | React 原生、輕量，足以做 §9 的散點/折線/長條/雷達 |
| 表單/驗證 | **React Hook Form + Zod** | Zod schema 前後端共用，欄位驗證（1–5、水溫 60–100…）一處定義 |
| 後端 / 資料庫 | **Supabase**（Postgres + Auth + RLS + Storage） | 一站式；權限用 RLS，天生契合「私有 → 分享」；DDL 直接沿用 DESIGN.md |
| 認證 | **Supabase Auth**（Email/密碼，選配 Google OAuth） | 內建、與 RLS 的 `auth.uid()` 直接串接 |
| 資料存取 | **@supabase/supabase-js + @supabase/ssr** | Next.js Server Components 讀取、Server Actions 寫入，皆走 RLS |
| Schema 遷移 | **Supabase CLI（SQL migrations 進 repo）** | DESIGN.md 的 DDL 版本控管；`supabase gen types` 產生 TS 型別 |
| 部署（前端） | **Vercel（Hobby，免費）** | 與 Next.js 零設定整合、公開網址 |
| 部署（後端） | **Supabase Cloud（Free 方案）** | 託管 Postgres，免自架 |
| CSV 匯出 | 前端產生（papaparse 或原生） | FR-8 |

> 一句話：**Next.js 前端掛 Vercel、資料與帳號在 Supabase，兩邊都跑免費方案，公開上線。**

---

## 2. 架構與資料流

```
 使用者瀏覽器
     │  HTTPS
     ▼
 ┌──────────────────────────┐        ┌───────────────────────────┐
 │  Vercel（Next.js）        │        │  Supabase                 │
 │  - React UI / 圖表        │  RLS   │  - Postgres（DESIGN schema）│
 │  - Server Components 讀取 │◀──────▶│  - Auth（auth.users）      │
 │  - Server Actions 寫入    │ anon   │  - Storage（Phase 2 照片） │
 │  - 用 anon key + 使用者   │ key    │  - Row Level Security      │
 │    session               │        │    user_id = auth.uid()    │
 └──────────────────────────┘        └───────────────────────────┘
```

- 前端只持有 **anon key**（公開安全）；所有存取由 **RLS** 在資料庫層強制隔離。
- **`service_role` key 絕不進前端**；僅在需要繞過 RLS 的伺服器管理作業（如標籤審核）時，於伺服器環境使用。
- 讀取以 Server Components 為主；互動式篩選/分析可視需要加 **TanStack Query**（選配）。

---

## 3. 成本分析（撰寫時 2026-07-08 查證，數字以官方最新為準）

### 3.1 免費額度

| 服務 | 免費方案關鍵額度 | 對本專案是否足夠 |
|---|---|---|
| **Supabase Free** | 500 MB 資料庫、1 GB 檔案儲存、5 GB 流量/月、50,000 MAU、2 個專案、無備份 | ✅ 純文字紀錄極省空間，數千筆綽綽有餘；小圈子遠低於 50k MAU |
| **Vercel Hobby** | 100 GB 頻寬/月、1M edge requests、1M function invocations、4 CPU 小時、100 build 分鐘/月；**僅限非商業/個人用途** | ✅ 個人/朋友使用遠低於上限 |

**結論：此規模下月成本 ≈ $0**。唯一選配支出是自訂網域（約 US$10–15/年；不買則用 `xxx.vercel.app` 免費網址）。

### 3.2 免費方案的注意事項與對策

| 注意事項 | 影響 | 對策 |
|---|---|---|
| **Supabase 免費專案閒置 1 週會自動暫停** | 一週無 API 請求 → 專案離線（資料保留），需手動或有請求時喚醒 | (a) 接受手動喚醒；(b) 用排程（GitHub Actions / Vercel Cron）每日打一次輕量查詢保持活躍；(c) 之後升 Pro |
| **Supabase Free 無自動備份** | 誤刪風險 | 已用 type-to-confirm 降低誤刪；另可定期 `pg_dump` 或 CSV 匯出（FR-8）作為手動備份 |
| **Vercel Hobby 僅限非商業** | 若未來商業化/營利需升級 | 目前為個人/朋友非營利用途，符合條款；若商業化再升 Pro（US$20/席/月） |
| **超量處理** | 免費超量多為擋寫/擋流量而非扣款 | 此規模不會觸及；有需要再升級 |

### 3.3 之後要花錢的觸發點（升級指引）

- 需要**永遠在線、不暫停** + 自動每日備份 → **Supabase Pro（US$25/月）**。
- 專案**商業化/營利** → **Vercel Pro（US$20/席/月）**。
- 資料/流量成長超過免費額度（本專案短期內不會）。

---

## 4. 安全要點（公開部署必守）

- **所有資料表啟用 RLS**：`beans / brews / grinders / tag_suggestions` 以 `user_id = auth.uid()` 隔離；`flavor_tags` 讀取 `scope='system' OR owner_user_id = auth.uid()`，寫入限本人（見 DESIGN §A.6）。
- 前端僅用 **anon key**；`service_role` 與其他機密只放 **Vercel 環境變數（Server 端）**，不進前端 bundle。
- Zod 驗證同時用於前端與 Server Actions；**不信任前端輸入**，寫入前再驗一次。
- Supabase Auth 管理密碼雜湊與 session；避免自建認證。
- 分享（Phase 2）再新增「公開讀取」policy，不影響現有隔離。

---

## 5. 專案結構（建議）

```
coffee/
├─ PRD.md  DESIGN.md  TECH.md          # 文件
├─ app/                                # Next.js App Router
│  ├─ (auth)/login, register           # P1
│  ├─ (app)/dashboard                  # P2
│  ├─ (app)/brews/[id], /new, /edit    # P3–P5
│  ├─ (app)/beans/[id], /new, /edit    # P6–P8
│  ├─ (app)/analytics                  # P9
│  └─ (app)/settings                   # P10
├─ components/                         # UI 元件（含 shadcn/ui）
│  └─ charts/                          # Recharts 封裝
├─ lib/
│  ├─ supabase/server.ts client.ts     # Supabase 用戶端（SSR / 瀏覽器）
│  ├─ validations/                     # Zod schema（欄位規則）
│  └─ format.ts                        # m:ss、1:NN 等顯示格式
├─ supabase/
│  ├─ migrations/*.sql                 # DESIGN.md 的 DDL
│  └─ seed.sql                         # §8 內建風味標籤
├─ types/database.ts                   # supabase gen types 產物
├─ .env.local                          # 本機環境變數（不進 git）
└─ package.json
```

---

## 6. 環境變數

| 變數 | 用途 | 放哪 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | 前端可見（公開） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 金鑰（受 RLS 保護） | 前端可見（公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理作業（如標籤審核） | **僅 Server 端**，Vercel 環境變數 |

---

## 7. 風險與備選

| 風險 | 緩解 / 備選 |
|---|---|
| 不滿意 Supabase 免費暫停 | 排程保活；或改 **Neon + Auth.js**（Neon 不整個暫停）；或升 Pro |
| 廠商鎖定疑慮 | 底層是標準 Postgres，DDL/資料可 `pg_dump` 遷出；Next.js 亦可搬離 Vercel |
| Vercel 非商業限制 | 個人用途無虞；商業化再升級或改自架（Docker + VPS） |

---

## 8. 下一步（M3 開發）

建議 M3 的第一批工作：

1. 建立 Next.js + TypeScript + Tailwind + shadcn/ui 專案骨架。
2. 建 Supabase 專案，套用 `migrations`（DESIGN 的 DDL）與 `seed.sql`（§8 標籤）。
3. 接 Supabase Auth（Email/密碼）+ 註冊時設定唯一 username。
4. 打通一條垂直切片：**登入 → 新增豆子 → 新增沖煮（含自動計算）→ 列表看到**。
5. 之後依 P3–P10 補齊 CRUD、篩選、分析。

要我接著把 **M3 的實作計畫（工作分解 / 里程碑順序）** 開出來，或直接開始建立專案骨架？

---

### 參考來源（成本數據）

- [Supabase Pricing（官方）](https://supabase.com/pricing)
- [Supabase Free Tier Limits 2026](https://www.itpathsolutions.com/supabase-free-tier-limits)
- [Vercel Hobby Plan（官方）](https://vercel.com/docs/plans/hobby)
- [Vercel Pricing（官方）](https://vercel.com/pricing)
