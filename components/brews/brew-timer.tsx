'use client'

import { useEffect, useRef, useState } from 'react'
import { Droplets, Flag, Play, Square, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { PourFormValue } from '@/lib/brew-form'
import {
  deviationLabel,
  elapsedSeconds,
  nextTarget,
  planLap,
  type LapRecord,
} from '@/lib/brew-timer'
import { formatSecondsToMSS } from '@/lib/format'

/**
 * FR-13 沖煮計時器（TIMER-1~3）＋ RCP-5 引導式沖煮。
 * 純輔助輸入：所有寫回都走父層 callback（RHF 的 field array 操作），
 * 手動填寫流程完全不受影響。手機吧台情境優先：大字、大按鈕、
 * Wake Lock 防休眠、計時以時間戳重算（切分頁不失準）。
 *
 * 「分段」的 update-or-append 語意見 lib/brew-timer.ts。
 * 悶蒸結束不提供撤銷（誤按可於結束後手動改欄位，成本低）。
 */
export function BrewTimer({
  pours,
  bloomTargetSec,
  onUpdatePour,
  onAppendPour,
  onRemovePour,
  onBloomEnd,
  onStop,
  onRunningChange,
}: {
  pours: PourFormValue[]
  /** 表單目前的悶蒸時間（載入配方時＝計畫值），開始時快照為悶蒸目標 */
  bloomTargetSec?: number
  onUpdatePour: (index: number, pour: PourFormValue) => void
  onAppendPour: (pour: PourFormValue) => void
  onRemovePour: (index: number) => void
  onBloomEnd: (sec: number) => void
  onStop: (sec: number) => void
  onRunningChange: (running: boolean) => void
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [startMs, setStartMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(0)
  const [bloomDone, setBloomDone] = useState(false)
  const [lapCount, setLapCount] = useState(0)
  const [undoStack, setUndoStack] = useState<LapRecord[]>([])
  const [lastLap, setLastLap] = useState<{
    seq: number
    sec: number
    targetSec?: number
  } | null>(null)
  // 悶蒸目標＝開始當下的表單值快照（悶蒸結束會覆寫表單值，不能直接用 prop）
  const [bloomTarget, setBloomTarget] = useState<number | undefined>(undefined)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const running = status === 'running'
  const elapsed =
    startMs != null && nowMs >= startMs ? elapsedSeconds(startMs, nowMs) : 0

  // 計時 tick：只存時間戳，顯示值每次由 Date.now() 重算
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(timer)
  }, [running])

  // TIMER-3：計時中保持螢幕喚醒（不支援則靜默略過）；切回分頁時重取
  useEffect(() => {
    if (!running) return
    let cancelled = false
    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock?.request('screen')
        if (cancelled) sentinel?.release()
        else wakeLockRef.current = sentinel ?? null
      } catch {
        // 電量不足或瀏覽器不支援：計時仍正確，只是螢幕可能休眠
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [running])

  // TIMER-3：計時中關閉/重整分頁需確認
  useEffect(() => {
    if (!running) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [running])

  function start() {
    setBloomTarget(bloomTargetSec)
    setBloomDone(false)
    setLapCount(0)
    setUndoStack([])
    setLastLap(null)
    setStartMs(Date.now())
    setNowMs(Date.now())
    setStatus('running')
    onRunningChange(true)
  }

  function handleBloomEnd() {
    onBloomEnd(elapsed)
    setBloomDone(true)
  }

  function handleLap() {
    const plan = planLap(pours, lapCount)
    if (plan.action === 'full') {
      toast.warning('分段已達 12 段上限')
      return
    }
    if (plan.action === 'update') {
      const prev = pours[plan.index]
      setUndoStack((s) => [
        ...s,
        {
          type: 'update',
          index: plan.index,
          prevEndTimeSec: prev.end_time_sec,
        },
      ])
      setLastLap({
        seq: plan.index + 1,
        sec: elapsed,
        targetSec: prev.end_time_sec,
      })
      onUpdatePour(plan.index, { ...prev, end_time_sec: elapsed })
    } else {
      setUndoStack((s) => [...s, { type: 'append', index: plan.index }])
      setLastLap({ seq: plan.index + 1, sec: elapsed })
      onAppendPour({
        end_time_sec: elapsed,
        cumulative_water_g: undefined,
        note: '',
      })
    }
    setLapCount((n) => n + 1)
  }

  function handleUndo() {
    const record = undoStack.at(-1)
    if (!record) return
    if (record.type === 'update') {
      const current = pours[record.index]
      if (current)
        onUpdatePour(record.index, {
          ...current,
          end_time_sec: record.prevEndTimeSec,
        })
    } else {
      onRemovePour(record.index)
    }
    setUndoStack((s) => s.slice(0, -1))
    setLapCount((n) => Math.max(0, n - 1))
    setLastLap(null)
  }

  function handleStop() {
    onStop(elapsed)
    setStatus('done')
    onRunningChange(false)
  }

  function reset() {
    setStatus('idle')
    setStartMs(null)
    onRunningChange(false)
  }

  if (status === 'idle') {
    const plannedCount = pours.filter(
      (p) => p.end_time_sec != null || p.cumulative_water_g != null,
    ).length
    return (
      <div className="space-y-2 rounded-md border border-dashed p-3">
        <Button type="button" className="h-12 w-full text-base" onClick={start}>
          <Play className="size-5" />
          開始計時
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          {plannedCount > 0
            ? `已有 ${plannedCount} 段計畫值，計時會逐段引導並寫入實際時間`
            : '按「悶蒸結束」「分段」即時記錄各時間點，水量沖完再補'}
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <p className="text-sm">
          <span className="text-muted-foreground">計時結束，總時間：</span>
          <span className="font-mono font-medium tabular-nums">
            {formatSecondsToMSS(elapsed)}
          </span>
          <span className="text-muted-foreground">
            （已寫入表單，可手動微調）
          </span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          重新計時
        </Button>
      </div>
    )
  }

  // running
  const target = nextTarget(pours, lapCount)
  const bloomRemaining = bloomTarget != null ? bloomTarget - elapsed : null
  const targetRemaining =
    target?.end_time_sec != null ? target.end_time_sec - elapsed : null

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p
        className="text-center font-mono text-5xl font-semibold tabular-nums"
        aria-live="off"
      >
        {formatSecondsToMSS(elapsed)}
      </p>

      {/* RCP-5 引導：悶蒸階段 → 下一段目標 → 上一段偏差回饋 */}
      <div className="min-h-5 text-center text-sm">
        {!bloomDone && bloomTarget != null ? (
          <p
            className={
              bloomRemaining != null && bloomRemaining < 0
                ? 'text-destructive'
                : ''
            }
          >
            悶蒸至 {formatSecondsToMSS(bloomTarget)}
            {bloomRemaining != null &&
              (bloomRemaining >= 0
                ? `（還有 ${bloomRemaining} 秒）`
                : `（已超過 ${-bloomRemaining} 秒）`)}
          </p>
        ) : target ? (
          <p
            className={
              targetRemaining != null && targetRemaining < 0
                ? 'text-destructive'
                : ''
            }
          >
            第 {lapCount + 1} 段：
            {target.end_time_sec != null &&
              `於 ${formatSecondsToMSS(target.end_time_sec)} 前`}
            {target.cumulative_water_g != null &&
              `注水至 ${target.cumulative_water_g} g`}
            {target.note && `，${target.note}`}
            {targetRemaining != null &&
              targetRemaining < 0 &&
              `（已超過 ${-targetRemaining} 秒）`}
          </p>
        ) : lastLap ? (
          <p className="text-muted-foreground">
            第 {lastLap.seq} 段 @ {formatSecondsToMSS(lastLap.sec)}
            {(() => {
              const label = deviationLabel(lastLap.sec, lastLap.targetSec)
              return label ? `（${label}）` : ''
            })()}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-12 text-base"
          onClick={handleBloomEnd}
          disabled={bloomDone}
        >
          <Droplets className="size-5" />
          {bloomDone ? '悶蒸已記錄' : '悶蒸結束'}
        </Button>
        <Button type="button" className="h-12 text-base" onClick={handleLap}>
          <Flag className="size-5" />
          分段（第 {lapCount + 1} 段）
        </Button>
      </div>
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
        >
          <Undo2 className="size-4" />
          撤銷分段
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleStop}>
          <Square className="size-4" />
          結束計時
        </Button>
      </div>
    </div>
  )
}
