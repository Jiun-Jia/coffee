# M3 實作計畫 — Phase 1 (MVP) 工作分解

| 項目 | 內容 |
|---|---|
| 對應 | PRD.md（M3–M5）、DESIGN.md、TECH.md |
| 版本 | v1.0 |
| 最後更新 | 2026-07-08 |
| 狀態 | 待確認（§6 待決事項定案後即可動工） |

> 本計畫由六個領域平行規劃後綜合而成，並經完整性查核：PRD 的 FR-1~FR-8 全部子項、DESIGN 的 P1~P10 頁面與 A1~A5 圖表均有對應任務。綜合時的修正見 §2。

---

## 1. 總覽

| 領域 | 前綴 | 任務數 | 估計（專注人日） | 範圍 |
|---|---|---:|---:|---|
| 骨架與工具鏈 | SETUP | 10 | 6.5 | Next.js 專案、shadcn/ui、Supabase 封裝、格式/驗證基礎、App 外殼、Vercel |
| 資料庫 | DB | 13 | 9 | Migrations、RLS、view、seed、型別產生、雲端專案 |
| 認證與帳號 | AUTH | 13 | 7.5 | 註冊/登入/登出、唯一 username、路由保護、設定頁帳號區塊 |
| 豆子與磨豆機 | BEAN | 9 | 8 | Bean CRUD、刪除確認、磨豆機管理、inline 新增豆子 |
| 沖煮核心 | BREW | 17 | 15 | P5 表單、自動計算、風味標籤、複製、P3 列表篩選、P4 詳情、我的標籤 |
| 分析與上線 | VIZ | 16 | 13 | A1–A5 圖表、P9、P2 Dashboard、CSV、響應式、保活、部署驗收 |
| **合計** | | **78** | **≈59** | 估計為專注工時；S=半天、M=一天、L=兩天以上 |

> 以業餘時間推進時，重點是 **W3 結束即有可用產品**（登入→建豆→記一杯→列表，已部署上線），之後每個 Wave 都在可用基礎上疊加。

---

## 2. 綜合修正（完整性查核結果）

1. **跨區依賴重對齊**：SETUP / BEAN 區規劃時引用的 DB / AUTH 編號為推測值，已全部改為實際編號（如 gen types = DB-11、RLS = DB-8、登入 = AUTH-6）。本文件的 dependsOn 為修正後版本。
2. **缺口補齊 — SETUP-10（App 外殼與側邊欄導覽）**：DESIGN B.1 的側邊欄（首頁/沖煮/豆子/分析/設定 + 手機收合選單）原本無人認領，新增任務。
3. **缺口補齊 — BREW-17（設定頁「我的標籤」區塊）**：P10 的自訂標籤列表管理（檢視/刪除/提交紀錄）原本無人認領，新增任務。
4. **DB-7 規格修正**：`brew_details` view 需加入 `beans.process`（處理法）與 `beans.varietal`，否則 P3 的處理法篩選（FR-7.1）與列表顯示做不出來。
5. **重疊消解**：SETUP-8 已建立 validations 骨架，BEAN-1 / BREW-1 定位為「在骨架上補完各自實體」，不重複建檔。
6. **A5 雷達維度定案依 PRD**：八維（七項感官 + 整體喜好度）。

---

## 3. 里程碑順序（Waves）

| Wave | 目標 | 任務 | 出口條件 |
|---|---|---|---|
| **W0 決策** | §6 待決事項定案 | — | 全部決定有答案（可採建議值） |
| **W1 骨架＋資料庫** | 本機可跑的空殼與完整 schema | SETUP-1~5, 7, 8, 10；DB-1~12 | `npm run dev` 起得來；`supabase db reset` 全過；RLS 驗證（DB-12）通過；typecheck 綠 |
| **W2 認證＋首次部署** | 帳號系統可用、站點上線 | SETUP-6, 9；AUTH-1~10；DB-13 | 在 `*.vercel.app` 可註冊（唯一 username）、登入、登出；未登入被導向 /login |
| **W3 垂直切片** | 最小可用產品 | BEAN-1~4, 7；BREW-1~7, 11, 12（基本版） | 手機+桌面可完成：登入→建豆→記一杯（自動計算生效）→列表看到 |
| **W4 完整功能** | Phase 1 全部 CRUD 與標籤 | BREW-8~10, 13~17；BEAN-5, 6, 8, 9；AUTH-11, 12 | FR-2/3/5/7 全數可驗收；P3~P8、P10 完整 |
| **W5 分析** | P9 與圖表 | VIZ-1~9 | A1~A5 全部可用、可套篩選 |
| **W6 打磨＋驗收** | Dashboard、匯出、上線驗收 | VIZ-10~16；AUTH-13 | VIZ-15 驗收清單全過（含雙帳號 RLS、效能 <1s、手機實測） |

依賴主幹：`DB schema → 認證 → 表單/列表 → 分析`。W3 的 BREW-11/12 先做「無篩選的基本列表」，完整篩選（BREW-13）留在 W4。

---

## 4. 任務分解

### 4.1 SETUP — 骨架與工具鏈

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| SETUP-1 | 初始化 Next.js + TS + Tailwind | create-next-app（App Router、@/* alias、不用 src/）；`lang="zh-Hant-TW"`；注意根目錄已有 .md 檔，先在暫存目錄產生再搬移 | — | S |
| SETUP-2 | ESLint / Prettier / 編輯器一致性 | prettier-plugin-tailwindcss、eslint-config-prettier、typecheck script；Windows 換行問題：.gitattributes `* text=auto eol=lf` + endOfLine lf | SETUP-1 | S |
| SETUP-3 | shadcn/ui 初始化與第一批元件 | components.json；button/input/select/form/dialog/popover+command/badge/table/card/sonner；裝 RHF + zod + resolvers | SETUP-1,2 | S |
| SETUP-4 | 目錄結構與路由骨架 | 依 TECH §5 建 (auth)/(app) 全部 P1–P10 佔位頁、components/charts、lib/*、supabase/migrations、types/ | SETUP-1 | S |
| SETUP-5 | 環境變數規範與啟動檢查 | .env.example 三變數；lib/env.ts 以 Zod 驗證，server-only 部分加 `import 'server-only'` | SETUP-1, DB-1 | S |
| SETUP-6 | lib/supabase 封裝（@supabase/ssr） | client.ts / server.ts（await cookies()、getAll/setAll）/ middleware.ts updateSession / admin.ts（service_role, server-only）；掛 Database 泛型（DB-11 前先佔位） | SETUP-4,5, DB-1（型別待 DB-11） | M |
| SETUP-7 | lib/format.ts 計算/顯示/解析 | formatSecondsToMSS、parseTimeToSeconds、calcRatioValue（捨入與 DB view 一致）、formatRatio、calcRestDays（時區取本地日）；Vitest 單元測試 | SETUP-1 | S |
| SETUP-8 | lib/validations 基礎 | enums.ts（焙度/沖煮類型 英文碼↔中文）、common.ts（score1to5、waterTemp 60–100、positiveDecimal ≤9999.99、nonNegSeconds）、bean/grinder/brew schema 骨架 | SETUP-7, DB-2 | M |
| SETUP-9 | Vercel 部署前置與首次部署 | 連 GitHub repo、環境變數（service_role 僅 server）、region 與 Supabase 對齊；驗證公開網址與 Preview 部署 | SETUP-1,5,6, DB-13 | S |
| SETUP-10 | **（新增）App 外殼與側邊欄導覽** | app/(app)/layout.tsx：DESIGN B.1 側邊欄（☕ Brewlog、首頁/沖煮/豆子/分析/設定、active 狀態），手機頂部收合選單；底部使用者區塊留 AUTH-10 插槽 | SETUP-3,4 | M |

### 4.2 DB — 資料庫

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| DB-1 | Supabase CLI 初始化與本機環境 | supabase init；Docker/WSL2 的 supabase start；db:start/stop/reset scripts；README 本機開發段落 | SETUP-1 | S |
| DB-2 | Migration：四個 enum | roast_level / brew_type / tag_scope / suggestion_status；註記未來 `alter type … add value 'espresso'` 需獨立 migration | DB-1 | S |
| DB-3 | Migration：profiles + auth trigger | profiles(id→auth.users.id, username unique)；handle_new_user()（security definer、set search_path）從 raw_user_meta_data 建 profile；撞名策略與 AUTH 對齊 | DB-1 | M |
| DB-4 | Migration：grinders + beans | grinders unique(user_id,name)；beans 全欄位（FK 改指 profiles）；idx_beans_user | DB-2,3 | S |
| DB-5 | Migration：flavor_tags + tag_suggestions | check 約束 system↔owner null；partial unique index（system 全域唯一、user 個人唯一） | DB-2,3 | S |
| DB-6 | Migration：brews + brew_flavor_tags | 全欄位含 check；bean_id on delete cascade（FR-2.3）、grinder_id set null；索引；updated_at trigger | DB-4,5 | M |
| DB-7 | Migration：brew_details view | rest_days、ratio_value；**必須 `with (security_invoker = true)`**（否則繞過 RLS）；**修正：加入 beans.process 與 varietal**（FR-7.1 篩選需要） | DB-6 | S |
| DB-8 | RLS：擁有者隔離五表 | profiles/grinders/beans/brews/tag_suggestions；insert/update 必加 **with check**；一律 to authenticated | DB-3,4,6 | M |
| DB-9 | RLS：標籤兩表 | flavor_tags 讀 system+本人、寫僅本人 user scope；brew_flavor_tags 以 exists 所屬 brew 判定，insert 另驗 tag 可見性 | DB-5,6 | M |
| DB-10 | seed.sql 內建風味標籤 | PRD §8 十二分類約 45 個，`on conflict do nothing` 冪等；雲端匯入 SOP 見 DB-13 | DB-5 | S |
| DB-11 | gen types 產生 types/database.ts | db:types script；view 欄位一律 nullable 需 narrowing；migration 改動後必跑並 commit | DB-2~7 | S |
| DB-12 | RLS 隔離驗證腳本 | 兩使用者互測：跨人讀寫全擋、system 標籤可讀、view 受 security_invoker 隔離、匿名 0 列；db:test:rls script | DB-8,9,10 | M |
| DB-13 | 雲端專案建立與推送流程 | Supabase Cloud（region 見 §6）、link + db push、seed 匯入、環境變數、README schema 變更 SOP | DB-1,8,9,10,11 | S |

### 4.3 AUTH — 認證與帳號

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| AUTH-1 | 認證 Zod schema | register/login/usernameSchema（規則見 §6 決策）；繁中錯誤訊息；前後端共用 | — | S |
| AUTH-2 | Auth 錯誤繁中映射 | lib/auth/messages.ts；含 trigger 失敗的籠統 500 →「使用者名稱可能已被使用」 | — | S |
| AUTH-3 | username 可用性檢查 action | 因 RLS 僅本人可讀 profiles，用 admin client（server-only）查 exists、僅回 boolean；正規化規則與 DB unique 索引一致 | SETUP-6, DB-3,8, AUTH-1 | S |
| AUTH-4 | 註冊頁 + signUp 流程 | RHF + debounce 可用性檢查；signUp 的 options.data.username 交給 DB-3 trigger 建 profile；錯誤經 AUTH-2 | SETUP-4,6, DB-3, AUTH-1~3 | M |
| AUTH-5 | Email 確認 callback / URL 設定 | 若停用 confirmation 則縮減為 Supabase Site URL / Redirect URLs 設定（含 localhost） | SETUP-6, AUTH-4 | S |
| AUTH-6 | 登入頁 + signInWithPassword | ?redirectTo= 返回原頁（僅站內相對路徑白名單，防 open redirect） | SETUP-4,6, AUTH-1,2 | S |
| AUTH-7 | 登出 action + 按鈕 | signOutAction + sign-out-button.tsx（供側邊欄/手機選單） | SETUP-6, AUTH-6 | S |
| AUTH-8 | middleware 路由保護 | getUser()（勿用 getSession）；redirect 時複製 updateSession 的 cookies 否則隨機登出；公開路由與 matcher 清單 | SETUP-6, AUTH-6 | S |
| AUTH-9 | getCurrentProfile() helper | React cache() 包裝；孤兒帳號（有 auth 無 profile）降級處理不白屏 | SETUP-6, DB-3,8 | S |
| AUTH-10 | 側邊欄使用者區塊 | user-nav.tsx（👤 username + 登出 + 設定連結）掛入 SETUP-10 的外殼 | AUTH-7,9, SETUP-10 | S |
| AUTH-11 | 設定頁帳號區塊（改 username） | 即時可用性檢查、23505 映射、revalidate 全站顯示；AlertDialog 提示改名回溯影響歷史顯示 | DB-8, AUTH-1,3,9 | M |
| AUTH-12 | 「沖煮人」顯示規約 | brews 不落地 brewer 欄位，顯示一律即時取 profiles.username；brewer-label.tsx 供 P4/P5 引用 | AUTH-9 | S |
| AUTH-13 | 認證端對端驗證 | 註冊失敗案例、redirectTo、改名即時生效、雙帳號 RLS、同名搶註競態；沉澱為檢查清單 | AUTH-4~12 | S |

### 4.4 BEAN — 豆子與磨豆機

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| BEAN-1 | Bean schema 補完 + 焙度對照 | 在 SETUP-8 骨架上補完 §7.1 全欄位驗證；roast_date 以 yyyy-MM-dd 字串處理避免時區位移 | SETUP-8, DB-11 | S |
| BEAN-2 | Bean 查詢 + Server Actions | listBeans（含 brews(count)）、getBean；create/updateBean（Zod 二次驗證、RLS 下 0 affected rows 轉明確錯誤、revalidatePath） | DB-4,8, AUTH-6, BEAN-1 | M |
| BEAN-3 | P8 豆子表單 | bean-form.tsx 三用（新增/編輯/inline）：導頁與 onSuccess 回呼分離；焙度 Select、date input | SETUP-3, BEAN-1,2 | M |
| BEAN-4 | P6 豆子列表 | 表格（含沖煮筆數、養豆天數）+ 手機卡片 + 空狀態；預設排序見 §6 | BEAN-2, SETUP-3 | M |
| BEAN-5 | P7 豆子詳情骨架 | 履歷 + 該豆沖煮簡表（讀 brew_details）+ [用這包沖煮] 連 /brews/new?beanId=；A1 比較表與養豆小圖留 VIZ-3/4 插槽（props 介面已定義） | BEAN-2,3, DB-7,8 | M |
| BEAN-6 | 刪除豆子 type-to-confirm | AlertDialog：開啟時即時查連帶沖煮筆數；輸入豆名（trim 後完全一致）；server 端二次比對；cascade 後導回列表 | BEAN-2,5, DB-6 | M |
| BEAN-7 | Grinder schema + actions | 唯一性靠 DB unique 捕捉 23505（不可先 select 有 race）；delete 後 grinder_id set null，回傳使用筆數供警示 | DB-4,8, AUTH-6 | S |
| BEAN-8 | P10 磨豆機管理 UI | grinder-manager.tsx：清單 + Dialog 表單 + 刪除警示（N 筆沖煮將失去綁定）；掛入設定頁 | BEAN-7, SETUP-3, AUTH-11（設定頁外殼） | M |
| BEAN-9 | 沖煮表單 inline 新增豆子 | Dialog + Portal（避免巢狀 form）；onSuccess(newBeanId) 自動選取、外層表單不失值；接 BREW-2 凍結的介面 | BEAN-3, BREW-2 | M |

### 4.5 BREW — 沖煮核心

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| BREW-1 | brewSchema 補完 | §7.3 全欄位；空字串→undefined 前處理；與 brews Insert 型別對齊 | SETUP-8, DB-6,11 | S |
| BREW-2 | P5 表單骨架（五分段） | 基本/器材/變因/感官/結論；豆子下拉（預載含 roast_date）；沖煮人唯讀（AUTH-12）；**凍結 onBeanCreated 介面給 BEAN-9**；提交先接 stub | BREW-1, SETUP-3, DB-11 | M |
| BREW-3 | create/updateBrew actions | 伺服器端再驗證→寫 brews→同步 brew_flavor_tags（update 時 diff）→revalidate→導向詳情；標籤同步非交易性，必要時改 RPC | BREW-1,2, DB-6,9 | M |
| BREW-4 | RatingInput 1–5 元件 | 點選 + 鍵盤 1–5；選填可清除回 null；aria radiogroup；接八個感官欄位 | BREW-2, SETUP-3 | S |
| BREW-5 | TimeInput 元件（m:ss↔秒） | 接受 "2:30" 或 "150"；onBlur 正規化；RHF 值一律 int 秒；非法即時錯誤 | BREW-2, SETUP-7 | S |
| BREW-6 | 即時自動計算 | watch 最小化；養豆天數（未選豆顯示—）、水粉比 1:NN（計入冰量開關連動、dose 為 0 不顯示）；口徑與 DB-7 view 一致 | BREW-2, SETUP-7, DB-7 | S |
| BREW-7 | 磨豆機下拉與刻度綁定 | 未選磨豆機時刻度停用；切換保留值但警示；空清單引導去設定頁 | BREW-2, BEAN-7 | S |
| BREW-8 | 風味標籤多選 combobox | Popover+Command；RLS 自動回 system+本人標籤；依分類分組；Badge chips；編輯模式預選；同名去重顯示 | BREW-2, SETUP-3, DB-9,11 | M |
| BREW-9 | 建立自訂標籤 + 提交建議 | 無結果時「建立『xxx』」→ createUserTag；撞 unique 直接選既有；提交建議寫 tag_suggestions（審核 Phase 1 走 Studio 手動） | BREW-8, DB-9 | M |
| BREW-10 | 編輯沖煮（/brews/[id]/edit） | defaultValues 映射（null→undefined、timestamptz→datetime-local、標籤預選）；重用表單走 updateBrew | BREW-2,3,8 | M |
| BREW-11 | listBrews 查詢層（FR-7 全參數） | 走 brew_details（含 process，見 DB-7 修正）；標籤篩選採兩段查詢備案；排序；關鍵字 ilike 豆名/店家/備註 | DB-7,9,11 | M |
| BREW-12 | P3 列表頁（表格+RWD 卡片） | 欄位含 1:NN、養豆、星號、標籤 chips；欄頭排序寫回 URL；空狀態；手機卡片 | BREW-11, SETUP-3,7 | M |
| BREW-13 | P3 篩選/搜尋列 | 九類條件 + 重設；全部序列化至 URL searchParams；下拉選項由使用者資料 distinct 產生 | BREW-11,12, BREW-8 | L |
| BREW-14 | P4 詳情頁 | 分段呈現全欄位；磨豆機+刻度成組；mapBrewToRadarData 純函式供 VIZ-2 雷達；編輯/複製/刪除入口 | BREW-11, DB-7,11, SETUP-7 | M |
| BREW-15 | 複製上一杯 / 複製為新紀錄 | 統一 /brews/new?copyFrom=；帶入除日期外全欄位（白名單常數管理）；P5 右上「複製上一杯」取最近一筆 | BREW-2,3,14 | M |
| BREW-16 | 刪除沖煮 | 一般 AlertDialog（type-to-confirm 僅豆子需要）；junction cascade 自動清 | BREW-14, SETUP-3, DB-6 | S |
| BREW-17 | **（新增）P10「我的標籤」區塊** | 自訂標籤清單（含使用次數）、刪除（確認：將自 N 筆沖煮移除）、提交建議入口與自己的提交狀態列表 | BREW-9, DB-9, AUTH-11（設定頁外殼） | M |

### 4.6 VIZ — 分析、儀表板與上線

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| VIZ-1 | 圖表基礎設施 | chart-config（色盤、1–5 固定 domain）、chart-container（'use client'、固定高度避免 ResponsiveContainer 0 高、skeleton、空狀態）；「圖表純展示、資料由 Server Component 傳入」原則 | SETUP-4, DB-11 | S |
| VIZ-2 | A5 感官雷達（可疊多筆） | 八維、domain [0,5]；多 series 半透明疊加上限 5；單筆模式供 P4（BREW-14 掛載） | VIZ-1, DB-11 | M |
| VIZ-3 | A1 同支豆比較表 + 標記最佳 | 接 BEAN-5 定義的介面；overall 最高（同分取最新）高亮 + 摘要；嵌入 P7 插槽 | DB-7,11, BEAN-5 | S |
| VIZ-4 | A3 養豆 vs 喜好度 | 散點 + 每日平均折線；P7 小圖模式與 P9 完整模式 | VIZ-1, DB-7, BEAN-5 | S |
| VIZ-5 | A2 喜好度 vs 變因散點 | X 軸可切換；grind_setting 文字需 parse-grind.ts 解析（失敗顯示「N 筆無法解析」）；**刻度軸強制先選單一磨豆機（FR-3.9），未選不繪圖** | VIZ-1, DB-7,11 | M |
| VIZ-6 | A4 標籤頻率/平均喜好度長條 | 橫向長條、「12 次 · avg 4.3」、前 15 名可展開；純展示（聚合在 VIZ-7） | VIZ-1, DB-11 | S |
| VIZ-7 | 分析頁資料層 | fetchAnalyticsBrews / fetchTagStats / fetchGrinders；.range() 分批避開 PostgREST 1000 筆上限；AnalyticsFilters 與 searchParams 轉換 | DB-7,11 | M |
| VIZ-8 | P9 篩選列 | 豆子/產地/焙度/日期起迄 + 重設；URL searchParams 驅動 | VIZ-7, SETUP-4 | M |
| VIZ-9 | P9 分析頁組裝 | 2×2 四象限（A2/A3/A4/A5）；A5 附沖煮多選器（上限 5）；各象限獨立 Suspense/空狀態 | VIZ-2,4~8 | M |
| VIZ-10 | Dashboard 統計資料層 + 統計卡 | 本月沖煮數/本月平均喜好度/最常用豆子/在養豆子數（§6 確認）；聚合查詢不拉全表 | DB-7,11 | S |
| VIZ-11 | P2 Dashboard 組裝 | 統計卡 + 最近 5 筆沖煮卡片 + 「＋新增沖煮」；全新使用者引導先建豆 | VIZ-10, SETUP-4, DB-7 | M |
| VIZ-12 | CSV 匯出 | brew_details 全欄位 + 標籤壓平（「藍莓\|柑橘」）；UTF-8 BOM 防 Excel 亂碼；.range() 分批；papaparse | DB-7,11, SETUP-4 | M |
| VIZ-13 | VIZ 範圍響應式 | A1 手機卡片、P9 單欄堆疊+篩選抽屜、P2 統計卡排版、chart compact 模式；375px 驗收 | VIZ-3,9,11 | M |
| VIZ-14 | Supabase 保活排程 | app/api/keepalive route（CRON_SECRET 驗證）+ vercel.json crons 每日一次；查匿名可過 RLS 的資源（system 標籤 head count） | SETUP-9, DB-11 | S |
| VIZ-15 | 正式環境部署驗收 | 環境變數/Auth URL 核對、全流程 smoke test、雙帳號 RLS、數百筆下 <1s、手機實測；驗收清單記錄 | SETUP-9, VIZ-9,11,12,13,14 | M |
| VIZ-16 | 自訂網域（選配） | 買網域→Vercel 綁定→Supabase Auth URL 更新；不買則用 *.vercel.app | VIZ-15 | S |

---

## 5. 跨區風險 Top 10（各區風險彙整去重）

1. **`brew_details` view 忘記 `security_invoker = true`** → 直接繞過 RLS 跨使用者外洩。DB-7 建立、DB-12 驗證、BEAN-5/VIZ 頁面複驗。
2. **@supabase/ssr cookie 流程**：middleware redirect 未複製 cookies → 隨機登出；判斷身分一律 `getUser()`。此坑症狀間歇、上線後才爆，AUTH-8 需照 checklist 做。
3. **RLS 寫入 policy 只寫 `using` 沒寫 `with check`** → 可插入別人 user_id 的資料。DB-8/9 逐條檢查，DB-12 有對應斷言。
4. **username 唯一性競態與 trigger 500**：撞名時 Supabase 只回籠統錯誤；預檢（AUTH-3）+ 錯誤映射（AUTH-2）+ 大小寫正規化與 DB 索引一致（§6 決策）。
5. **時區陷阱（UTC+8）**：rest_days 以 `::date` 相減、Dashboard「本月」月界、datetime-local 無時區——前後端統一以本地日（Asia/Taipei）取日，SETUP-7 以測試鎖定，與 DB view 口徑比對。
6. **RLS 靜默失敗**：update/delete 他人資料回 0 rows 非錯誤，所有 Server Action 必須檢查 affected rows。
7. **前端計算 vs DB view 捨入不一致**：JS 浮點 `.x5` 邊界與 Postgres `round(numeric,1)` 可能不同；SETUP-7 固定策略（`Math.round(x*10)/10`）並測試比對。
8. **PostgREST 預設 1000 筆上限**：分析聚合與 CSV 不用 `.range()` 分批會靜默截斷（VIZ-7/12）。
9. **grind_setting 自由文字**：A2 刻度軸需解析數值，解析失敗必須顯示排除筆數而非默默消失（VIZ-5）；刻度軸未選磨豆機時硬性不繪圖（FR-3.9）。
10. **版本組合鎖定**：Next.js 15（async cookies()）× Tailwind v4（CSS-first）× shadcn/ui 的支援方式互相牽動，SETUP-1/3 先定版本，否則全區元件寫法受影響。

其餘領域內風險已寫入各任務描述（如巢狀 form 的 Portal、23505 捕捉、Excel BOM、Vercel Hobby cron 精度等）。

---

## 6. 待決事項（W0：動工前定案）

有建議值者可直接採納；標 ⚠ 的會影響 schema 或流程，最好現在定。

| # | 決定 | 建議 | 影響 |
|---|---|---|---|
| D1 ⚠ | Email 確認信 | MVP **停用**（降低註冊摩擦；正式開放朋友用再開 + 自訂 SMTP） | AUTH-4/5 |
| D2 ⚠ | username 規則 | 3–20 字元、小寫英數與 `_-`、**大小寫不敏感唯一**（DB 用 lower() unique index）；不允許中文 | DB-3, AUTH-1/3 |
| D3 ⚠ | 忘記密碼 | **納入 MVP**（公開部署的密碼系統必備；約 +1 M 任務 AUTH-14） | AUTH 區 |
| D4 ⚠ | profiles 是否存 email | **不存**（避免與 auth.users 同步問題；需要時 join 取得）——偏離 DESIGN §A.3，需你同意 | DB-3 |
| D5 ⚠ | beans/grinders 加 updated_at | **加**（現在加最便宜） | DB-4 |
| D6 | 版本鎖定 | Next.js 15 + React 19 + Tailwind v4（跟 create-next-app 預設） | SETUP-1/3 |
| D7 | 套件管理器 | pnpm | SETUP-1 |
| D8 | Dark mode / 主題 | base color 用 stone（暖色）；**掛 next-themes 支援深色** | SETUP-3 |
| D9 | 中文字型 | next/font 自架 Noto Sans TC | SETUP-1 |
| D10 | Region | Supabase 東京（ap-northeast-1）+ Vercel hnd1 | DB-13, SETUP-9 |
| D11 | 濾杯輸入 | 常見選項下拉 + 可自填（combobox），利於 P3 篩選 | BREW-2/13 |
| D12 | 冰手沖連動 | 選冰手沖：冰量必填、「計入冰量」預設開；選手沖：隱藏冰量 | BREW-6 |
| D13 | 「複製上一杯」定義 | 已選豆子→該豆最近一筆；未選→全域最近一筆 | BREW-15 |
| D14 | 喜好度篩選 | 依 wireframe 用「≥N」單向門檻 | BREW-13 |
| D15 | P3 分頁 | MVP 不分頁（個人規模數百筆），超過再說 | BREW-12 |
| D16 | P2 統計卡 | 本月沖煮數、本月平均喜好度、最常用豆子、在養豆子數 | VIZ-10 |
| D17 | CSV 格式 | 中文表頭、匯出全部紀錄、標籤以 \| 分隔 | VIZ-12 |
| D18 | 提交建議標籤時 | 同步建立為個人標籤立即可用 | BREW-9 |
| D19 | 保活方式 | Vercel Cron（與部署同平台） | VIZ-14 |
| D20 | 自訂網域 | 先不買，用 *.vercel.app | VIZ-16 |
| D21 | 水粉比顯示 | 一律一位小數（1:16.0），與 view round(...,1) 一致 | SETUP-7 |
| D22 | 豆名比對（刪除確認） | trim 後完全一致（含大小寫） | BEAN-6 |

---

## 7. 下一步

1. 你確認 §6（特別是 ⚠ 的 D1–D5）。
2. 動工 W1：SETUP-1 起手，DB-1 並行。
3. 每個 Wave 結束做一次驗收與 commit，W2 起每次合併即自動部署。
