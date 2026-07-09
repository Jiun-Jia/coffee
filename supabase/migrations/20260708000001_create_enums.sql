-- DESIGN §A.2：enum 存穩定英文碼，前端對應中文顯示（lib/validations/enums.ts）。
-- 未來擴充沖煮類型（如義式）：`alter type brew_type add value 'espresso';`
-- 注意：add value 需獨立 migration，且不可與使用新值的語句同一交易；enum 值無法移除。

create type roast_level as enum (
  'light',
  'medium_light',
  'medium',
  'medium_dark',
  'dark'
);

create type brew_type as enum (
  'pour_over',
  'iced_pour_over'
);

create type tag_scope as enum (
  'system',
  'user'
);

create type suggestion_status as enum (
  'pending',
  'approved',
  'rejected'
);
