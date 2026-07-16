# Phase 3 實作計畫 — 體驗優化 工作分解

| 項目 | 內容 |
|---|---|
| 對應 | PRD.md §4.3、FR-9（擴充）、FR-13～FR-27 |
| 版本 | v1.1 |
| 最後更新 | 2026-07-15 |
| 狀態 | **已定案，可動工**（§6 六項待決事項於 2026-07-15 全數定案） |

> Phase 3 的主軸：把系統從「事後記錄工具」升級為「沖煮循環的全程夥伴」。三個缺口——沖煮當下沒有工具、豆子沒有生命週期、分析停在圖表——各對應一個 Wave。

---

## 1. 實作原則

1. **只加不改（additive migrations）**：所有 schema 變更為新增 nullable 欄位或新資料表，不動既有欄位與 RLS 邏輯；本機一律 `supabase migration up`（不跑 `db reset`，本機 Supabase 於 WSL）。
2. **手機優先的例外**：整體仍桌面優先，但 FR-13 計時器 / FR-14 引導式沖煮的使用場景在吧台，這兩項以手機版面為第一優先（大按鈕、大字、Wake Lock）。
3. **沿用既有件**：圖表一律 Recharts + 既有 `chart-tooltip`；表單一律 RHF + Zod；權限一律 DB 層 RLS（群組可見性沿用 `is_group_member()` 等函式）。
4. **免費層成本敏感**：照片嚴格前端壓縮（FR-22.2）、Storage 用量可見；不引入付費服務。
5. **Next.js 16 注意**：動工前先讀 `node_modules/next/dist/docs/` 相關章節（PWA/manifest、route handlers、og image 均有版本差異），不可憑印象寫。

---

## 2. 總覽

| Wave | 主題 | FR | 任務前綴 | 估計（專注人日） |
|---|---|---|---|---:|
| **W1** ✅ | 沖煮當下體驗（2026-07-15 完成；TIMER-5 專注模式 07-16 補齊） | FR-13、FR-14 | TIMER、RCP | ≈ 8 |
| **W1.5** | 群組配方（推薦→審核→分區使用，2026-07-16 新增） | FR-14.5～14.8 | RCPG | ≈ 3 |
| **W2** ✅ | 豆子生命週期＋風味輪（2026-07-16 完成） | FR-15、FR-18、FR-21 | INV、COST、WHL | ≈ 5 |
| **W3** | 分析到行動（後補池：待資料累積） | FR-16、FR-17、FR-19、FR-20 | WIN、CMP、INS、RVW | ≈ 9 |
| **W4** ✅ | 照片與分享（2026-07-16 完成；SHARE-3 選配與列表縮圖延後） | FR-22、FR-9 | PHOTO、SHARE | ≈ 8 |
| **W5** | 進階與底層 | FR-23、FR-24、FR-25、FR-27、FR-26(spike) | TDS、IMP、PWA、RXN、BLE | ≈ 9 |
| **合計** | | | | **≈ 42** |

Wave 之間無硬性依賴（除 COST 依賴 INV、WIN 依賴 INV-3），每個 Wave 結束即可獨立上線。
2026-07-16 順序調整理由：群組配方沿用已驗證的「器材/標籤提案審核」模式風險低、且趁 W1 熱度補齊配方閉環；FR-16 適飲/FR-19 建議需累積沖煮資料才有個人化價值（現在做多半落在預設值），與 FR-17/20 一併移到 W3 後補。

---

## 3. 資料模型變更彙總

全部為 additive；每項一支獨立 migration。

| Migration | 內容 |
|---|---|
| `recipes` | 新表：`id, user_id, name, source_brew_id (set null), brew_type, dripper, filter, kettle, grinder_id (set null), grind_setting, water_temp, dose_g, water_g, ice_g, bloom_water_g, bloom_time_sec, total_time_sec, pours jsonb, notes, created_at, updated_at`。分段以 jsonb 快照（`[{end_time_sec, cumulative_water_g, note}]`），不另開子表（配方分段不需獨立查詢）。RLS：僅本人。 |
| `beans` 擴充 | `purchase_weight_g numeric`、`price int`、`archived_at timestamptz`（皆 nullable） |
| `brews` 擴充 | `tds numeric(4,2)`、`beverage_weight_g numeric`（FR-23，nullable） |
| 照片 | `beans.photo_path text`、`brews.photo_path text`；Storage bucket `photos`（private），路徑約定 `{user_id}/{bean|brew}/{id}.webp` |
| 公開分享 | `beans.public_slug text unique`、`brews.public_slug text unique`（nullable；null＝未公開） |
| `brew_reactions` | 新表：`brew_id FK cascade, user_id FK, emoji text check（限白名單）, created_at`，`unique(brew_id, user_id)`。RLS：讀＝看得到該 brew 的人（沿用既有可見性函式）；寫＝本人且非自己的沖煮。 |
| View | `brew_details` 加 `extraction_pct = tds * beverage_weight_g / dose_g`（有值才算）；新增 `bean_usage` view：每豆 `sum(dose_g)`、`avg(dose_g)`、沖煮數（庫存與成本共用） |

---

## 4. 任務分解

### 4.1 W1 — 沖煮當下體驗

**TIMER（FR-13 計時器）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| TIMER-1 | 計時器核心元件 | `components/brews/brew-timer.tsx`（client）：開始/悶蒸結束/分段/停止/重設；經 RHF `setValue` 寫回 `bloom_time_sec`、pours field array 的 `end_time_sec`、`total_time_sec`；撤銷上一分段 | — | M |
| TIMER-2 | 表單整合與手機版面 | 嵌入 brew-form 注水分段卡片頂部，可收合；計時中鎖定手動時間欄位避免打架；手機大按鈕/大字佈局 | TIMER-1 | S |
| TIMER-3 | Wake Lock 與離開保護 | Screen Wake Lock API（不支援則靜默略過）；計時中 `beforeunload` 確認；分頁切回時以 timestamp 重算經過秒數（背景計時不失準） | TIMER-1 | S |
| TIMER-4 | 單元測試 | 計時→分段→寫回欄位的整合測試（Vitest + fake timers） | TIMER-1 | S |
| TIMER-5 ✅ | **（FR-13.5）專注計時模式**（2026-07-16 完成） | 手機 UX 修正：計時期間改為全螢幕計時畫面（大碼表＋固定不動的悶蒸/分段/結束大按鈕），**計時中不渲染任何輸入框**，僅唯讀分段清單即時滾動；RCP-5 引導同畫面顯示；結束計時才返回表單補水量/手法。實作：`brew-timer.tsx` running 狀態改渲染 fixed 全螢幕層（非 Dialog，防 ESC 誤關）；清單由 pours 前 lapCount 列推導（`completedLaps()`）；計時中鎖背景捲動。 | TIMER-1, TIMER-2 | M |

**RCP（FR-14 配方）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| RCP-1 | Migration + RLS + 型別 | `recipes` 表（§3）；`db:types` 更新 | — | S |
| RCP-2 | 存成配方 | 沖煮詳情「存成配方」dialog（命名＋快照欄位與分段）；Zod schema `lib/validations/recipe.ts` | RCP-1 | S |
| RCP-3 | 載入配方 | `/brews/new?recipeId=` 預填全欄位＋分段；表單頂部「載入配方」下拉（同豆歸屬過濾器材邏輯不變） | RCP-1 | M |
| RCP-4 | 配方管理 | 配方列表（檢視/改名/刪除/編輯參數）；入口＝沖煮頁「配方」子分頁（§6 決議-1） | RCP-2 | M |
| RCP-5 | 引導式沖煮 | 計時器載有配方分段時：顯示「下一目標：m:ss 前注水至 NNN g」、目前段落進度與偏差秒數；沖完寫回實際值 | TIMER-1, RCP-3 | M |

### 4.1.5 W1.5 — 群組配方（FR-14.5～14.8，2026-07-16 新增）

沿用「群組器材」的提案審核模式（FR-10.9b）：migration、RLS、審核 UI 均有現成前例。

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| RCPG-1 | Migration + RLS + 型別 | `recipes` 加 `group_id`（nullable、on delete **set null**＝解散退回推薦者個人配方）＋ `status`（pending/approved，預設 approved）；unique 改兩條 partial（個人：user_id+name where group_id is null；群組：group_id+name where approved）；RLS 仿 gear_approval：讀＝本人或群組成員、insert 群組配方需 is_group_member、pending 提交者可撤回、審核（status 變更）＝is_group_manager、已核可的編輯/刪除＝is_group_owner | — | M |
| RCPG-2 | 推薦與審核流 | 配方分頁「推薦給群組」（快照複製一份 pending，個人原件保留）；群組內頁新增「群組配方」區塊（同器材區塊版式）：pending 清單＋核可/退回、提交者撤回、顯示推薦者；已核可清單（建立者可編輯/刪除，編輯復用 RecipeForm） | RCPG-1 | M |
| RCPG-3 | 下拉分區與豆歸屬過濾 | 「載入配方」下拉分區（個人配方／各群組配方）；依所選豆過濾：個人豆→僅個人配方、群組豆→該群組配方＋個人配方（沿用 byBeanOwnership 邏輯）；配方分頁分區列示 | RCPG-1 | M |
| RCPG-4 | 複製到我的配方 | 群組配方列「複製到我的配方」action（快照為個人配方；名稱衝突提示改名） | RCPG-1 | S |
| RCPG-5 | RLS 測試 | rls_test.sql 補群組配方情境：成員可讀不可改、非成員不可見、pending 僅提交者/管理者可動、離群後不可見 | RCPG-1 | S |

### 4.2 W2 — 豆子生命週期

> 2026-07-16 調整：本 Wave＝ INV＋COST＋**WHL-1（自 §4.3 移入）**；WIN（FR-16）移到 W3 後補（需累積沖煮資料才有個人化區間）。

**INV（FR-15 庫存與封存）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| INV-1 | Migration + view | `beans` 三欄位 + `bean_usage` view（§3）；型別更新 | — | S |
| INV-2 | 表單與顯示 | 豆子表單加購入重量；列表/詳情顯示剩餘克數與預估杯數（群組豆計全員用量）；剩餘 ≤ 0 顯示「建議封存」 | INV-1 | M |
| INV-3 | 封存流程 | 封存/解除封存 action（僅豆子建立者）；沖煮表單下拉、Dashboard 在養豆數、豆子列表預設排除封存豆（列表可切換「含已封存」）；封存徽章 | INV-1 | M |

**WIN（FR-16 適飲期提示）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| WIN-1 | 區間演算法 | `lib/queries/drinking-window.ts`：該豆沖煮 ≥ 3 → 取整體喜好度前 50% 沖煮的養豆天數 P25–P75 為區間；不足則按焙度預設：淺 10–30、中淺/中 7–21、中深/深 5–14 天（§6 決議-2）；Vitest 覆蓋 | INV-3 | M |
| WIN-2 | Dashboard 卡片 | 「適飲中」卡片：列出落在區間內的未封存豆（豆名、第 N 天、區間）；豆子詳情同步顯示 | WIN-1 | S |

**COST（FR-18 成本）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| COST-1 | 價格欄位與每杯成本 | 豆子表單加價格；沖煮詳情顯示每杯成本（價格×粉量÷購入重量，兩者皆有值才算） | INV-1 | S |
| COST-2 | 消費統計 | 分析頁新增區塊：每月花費長條（按豆子購入月）、平均每杯成本 | COST-1 | S |

### 4.3 W3 — 分析到行動（後補池）

> 2026-07-16 調整：WHL-1 移入 W2；WIN（FR-16，見 §4.2）移入本 Wave。本 Wave 待沖煮資料累積後再排程。

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| CMP-1 | 對照頁 | `/brews/compare?a=&b=`：server 端取兩筆（各自過可見性）；逐列對照表格元件，相異欄位高亮；注水分段並排時間軸 | — | M |
| CMP-2 | 入口與雷達 | 列表勾選兩筆→「比較」；詳情頁「與另一杯比較」（候選＝同豆其他沖煮，含群組成員的）；嵌入雙筆 A5 雷達 | CMP-1 | S |
| INS-1 | 觀察查詢 | `lib/queries/bean-insights.ts`：水溫（±2°C 分桶）/粉水比（0.5 級距）/同磨豆機刻度 三維度聚合；兩側樣本 ≥ 3 且差 ≥ 0.5 分才產生，最多 3 則 | — | M |
| INS-2 | 豆子詳情整合 | 「觀察」卡片渲染 INS-1 結果（純文字句，含樣本數註記） | INS-1 | S |
| RVW-1 | 回顧查詢與頁面 | 分析頁「回顧」分頁：月/年切換；總杯數、總用豆量、豆子數、喜好度走勢（折線）、標籤偏好變化（前後期對比）、最佳一杯連結 | — | M |
| WHL-1 | 風味輪圖 | `components/charts/flavor-wheel.tsx`：Recharts 雙層 Pie（內圈 category、外圈標籤；顏色深淺＝平均喜好度）；A4 區塊加「風味輪/長條」切換 | — | M |

### 4.4 W4 — 照片與分享

**PHOTO（FR-22）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| PHOTO-1 | Storage 與 migration | bucket `photos`（private）＋ storage RLS（寫僅本人路徑）；`photo_path` 兩欄位；讀取一律 server 端簽名 URL（群組可見性在 server 判定，不開 storage 讀權限） | — | M |
| PHOTO-2 | 前端壓縮上傳 | `lib/image.ts`：canvas 縮放（長邊 1600px）＋ WebP 輸出（≤ 500KB）；豆子/沖煮表單上傳元件（預覽、替換、刪除） | PHOTO-1 | M |
| PHOTO-3 | 顯示與清理 | 詳情頁與列表縮圖；刪除豆子/沖煮連動刪 Storage 物件；設定頁顯示個人用量 | PHOTO-2 | S |

**SHARE（FR-9）**

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| SHARE-1 | Slug 與開關 | `public_slug` 欄位；詳情頁「公開分享」開關（開＝產生 nanoid slug、關＝清空作廢）；群組豆：沖煮僅本人可公開、豆子頁僅建立者可公開且不列他人沖煮（§6 決議-4） | — | S |
| SHARE-2 | 公開配方卡頁 | `app/share/[slug]/page.tsx`（無需登入、獨立於 (app) 外殼）：server 以 admin client 按 slug 查詢、**欄位白名單**輸出（備註/下次調整不出）；含 og meta；`robots noindex` | SHARE-1 | M |
| SHARE-3 | 配方卡圖片匯出（選配） | 依 Next 16 og-image 產生分享圖，或前端 html-to-image 下載；先讀官方 docs 再定技術路線 | SHARE-2 | M |

### 4.5 W5 — 進階與底層

| ID | 任務 | 內容要點 | 依賴 | 估 |
|---|---|---|---|:-:|
| TDS-1 | 欄位與控制圖 | migration（tds/beverage_weight_g）＋ view 加萃取率；表單「進階量化」收合區；`components/charts/control-chart.tsx` 萃取控制圖（理想區底色 18–22% × 1.15–1.45%） | — | M |
| IMP-1 | CSV 匯入 | 設定頁匯入區：解析本系統 CSV（含分段格式反解析）、預覽與重複偵測（同豆＋同時間跳過）、批次寫入（自動補建缺豆）；錯誤逐列回報 | — | L |
| PWA-1 | 可安裝與草稿暫存 | manifest＋icons（先讀 Next 16 docs）；brew-form 草稿 localStorage 自動保存/恢復提示（斷線不掉資料） | — | M |
| RXN-1 | 表情回應 | `brew_reactions` 表＋RLS（§3）；沖煮詳情與群組動態的表情列（加/換/收回）；白名單＝👍 ☕ 🔥 😮（§6 決議-5） | — | M |
| BLE-1 | 藍牙秤 spike | 技術驗證文件：Web Bluetooth 瀏覽器支援矩陣、Acaia/Timemore 協定公開資源盤點、原型可行性結論；**不寫產品碼**，結論決定是否立項 | TIMER-1 | M |

---

## 5. 驗收重點（每 Wave 出口條件）

| Wave | 出口條件 |
|---|---|
| W1 | 手機實測：載入配方→計時器引導完成一杯→存檔，全程不碰鍵盤除了水量；螢幕不休眠；既有手動流程不受影響 |
| W2 | 建豆填重量→沖幾杯→剩餘量正確（群組豆雙帳號驗證）→封存後各下拉/統計消失、歷史分析仍在 |
| W3 | 對照頁高亮正確；觀察句子的樣本數門檻生效（小樣本不出句）；風味輪與長條數據一致 |
| W4 | 雙帳號驗證：照片可見性跟隨資源；公開連結未登入可開、關閉後 404；白名單外欄位不出現在 HTML |
| W5 | 匯出→清帳號→匯入還原一致；TDS 空值不影響既有圖表；RLS 驗證 reactions 不可越權 |

---

## 6. 待決事項（✅ 已於 2026-07-15 全數定案，照建議值）

| # | 問題 | 決議 |
|---|---|---|
| 1 | FR-14 配方管理入口放哪？ | **沖煮頁加「配方」子分頁**（使用場景在沖煮側），設定頁不放 |
| 2 | FR-16 焙度預設適飲區間數值？ | **淺 10–30 天、中淺/中 7–21 天、中深/深 5–14 天**（上線後可依實測調整） |
| 3 | FR-22 群組豆照片對成員可見？ | **可見**（跟隨豆子可見性） |
| 4 | FR-9 群組豆可否公開分享？ | **沖煮僅本人的可公開；群組豆的「豆子」頁僅豆子建立者可公開，且公開頁不列其他成員的沖煮** |
| 5 | FR-27 表情白名單？ | **👍 ☕ 🔥 😮 四個起步** |
| 6 | Wave 順序是否照 §2？ | **照 §2 順序**；W1 完成即先上線 |
