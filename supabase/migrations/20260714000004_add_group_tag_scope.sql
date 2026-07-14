-- tag_scope 加入 'group'（FR-5.6 改版：標籤審核走群組建立者）。
-- alter type ... add value 不可與「使用新值」同一交易，故獨立成一支 migration；
-- 使用該值的欄位/政策在 20260714000005。

alter type public.tag_scope add value if not exists 'group';
