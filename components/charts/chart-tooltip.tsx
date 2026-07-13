'use client'

/** 共用 tooltip 外觀：popover 表面、text tokens（文字不穿系列色） */
export function ChartTooltipFrame({
  title,
  rows,
}: {
  title?: string
  rows: { label: string; value: string; color?: string }[]
}) {
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      {title && <p className="mb-1 font-medium">{title}</p>}
      {rows.map((row, i) => (
        <p key={i} className="flex items-center gap-1.5">
          {row.color && (
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: row.color }}
            />
          )}
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto pl-3 font-medium">{row.value}</span>
        </p>
      ))}
    </div>
  )
}
