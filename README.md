# Brewlog ☕

手沖咖啡沖煮紀錄系統：記錄豆子履歷、器材與沖煮變因、感官評分與風味標籤，
並以趨勢圖表找出「哪些變因造就好喝的一杯」。

- 需求與設計：[PRD.md](PRD.md) · [DESIGN.md](DESIGN.md) · [TECH.md](TECH.md) · [M3-PLAN.md](M3-PLAN.md)
- 部署：[DEPLOY.md](DEPLOY.md)

## 技術棧

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Recharts；
Supabase（Postgres + Auth + RLS）；部署於 Vercel。

## 本機開發

前置：Node 20+、pnpm、Docker（本專案在 WSL2 Ubuntu 內跑 Supabase）。

```bash
pnpm install

# 啟動本機 Supabase（於 WSL；首次會下載 images）
supabase start
# 金鑰見 `supabase status`，填入 .env.local（參考 .env.example）

pnpm dev          # http://localhost:3001（3000 保留給其他服務）
```

常用指令：

| 指令 | 用途 |
|---|---|
| `pnpm db:reset` | 重建本機 DB（套 migrations + seed） |
| `pnpm db:types` | 由 schema 產生 `types/database.ts` |
| `pnpm db:test:rls` | RLS 隔離驗證（雙帳號互測，改動 policy 後必跑） |
| `pnpm test` | 單元測試（lib/format、lib/validations） |
| `pnpm typecheck && pnpm lint` | 型別與風格檢查 |

## Schema 變更 SOP

`supabase migration new <name>` → 本機 `pnpm db:reset` + `pnpm db:test:rls`
→ `pnpm db:types` → commit → （雲端）`supabase db push`。
