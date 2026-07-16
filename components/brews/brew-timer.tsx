'use client'

import { useEffect, useRef, useState } from 'react'
import { Droplets, Flag, Play, Square, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { PourFormValue } from '@/lib/brew-form'
import {
  completedLaps,
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
 * FR-13.5 專注計時模式（TIMER-5）：計時期間改為全螢幕覆蓋層——
 * 按鈕固定在底部永不位移、不渲染任何輸入框（分段以唯讀清單顯示），
 * 解決「每按分段就長出輸入列、畫面被撐高、得捲回才能再按」的手機問題。
 * 刻意用 fixed 層而非 Dialog：避免 ESC / 手勢返回誤關計時畫面。
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
  // 悶蒸實際結束秒數（唯讀清單顯示用；表單值已由 onBloomEnd 寫回）
  const [bloomEndSec, setBloomEndSec] = useState<number | null>(null)

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

  // FR-13.5：專注模式期間鎖住背景頁面捲動——結束計時回到表單時
  // 停在原本的位置（不再需要「拉回畫面」）
  useEffect(() => {
    if (!running) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [running])

  function start() {
    setBloomTarget(bloomTargetSec)
    setBloomDone(false)
    setBloomEndSec(null)
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
    setBloomEndSec(elapsed)
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
            ? `已有 ${plannedCount} 段計畫值，將進入全螢幕計時並逐段引導`
            : '進入全螢幕計時，按「分段」即時記錄時間點，水量沖完再補'}
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
            （各段時間已寫入下方欄位，接著補水量與手法）
          </span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          重新計時
        </Button>
      </div>
    )
  }

  // running — FR-13.5 專注計時模式：全螢幕覆蓋層，計時中不渲染任何輸入框
  const target = nextTarget(pours, lapCount)
  const bloomRemaining = bloomTarget != null ? bloomTarget - elapsed : null
  const targetRemaining =
    target?.end_time_sec != null ? target.end_time_sec - elapsed : null
  const laps = completedLaps(pours, lapCount)
  const lastLapDeviation = lastLap
    ? deviationLabel(lastLap.sec, lastLap.targetSec)
    : null

  return (
    <div className="bg-background fixed inset-0 z-50 flex h-dvh flex-col px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p
        className="text-center font-mono text-7xl font-semibold tabular-nums"
        aria-live="off"
      >
        {formatSecondsToMSS(elapsed)}
      </p>

      {/* RCP-5 引導（主）＋上一段偏差回饋（副） */}
      <div className="min-h-16 space-y-1 py-3 text-center">
        {!bloomDone && bloomTarget != null ? (
          <p
            className={`text-lg ${
              bloomRemaining != null && bloomRemaining < 0
                ? 'text-destructive'
                : ''
            }`}
          >
            悶蒸至 {formatSecondsToMSS(bloomTarget)}
            {bloomRemaining != null &&
              (bloomRemaining >= 0
                ? `（還有 ${bloomRemaining} 秒）`
                : `（已超過 ${-bloomRemaining} 秒）`)}
          </p>
        ) : target ? (
          <p
            className={`text-lg ${
              targetRemaining != null && targetRemaining < 0
                ? 'text-destructive'
                : ''
            }`}
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
        ) : (
          <p className="text-muted-foreground text-lg">
            注水中——完成本段時按「分段」
          </p>
        )}
        {lastLap && (
          <p className="text-muted-foreground text-sm">
            上一段：第 {lastLap.seq} 段 @ {formatSecondsToMSS(lastLap.sec)}
            {lastLapDeviation && `（${lastLapDeviation}）`}
          </p>
        )}
      </div>

      {/* 已完成分段：唯讀清單（最新在前），清單捲動、按鈕不動 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {(laps.length > 0 || bloomEndSec != null) && (
          <ol className="mx-auto w-full max-w-sm space-y-1.5 text-sm">
            {laps.map(({ seq, pour }) => (
              <li
                key={seq}
                className="flex items-baseline gap-3 rounded-md border px-3 py-2"
              >
                <span className="text-muted-foreground shrink-0">
                  第 {seq} 段
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {pour.end_time_sec != null
                    ? formatSecondsToMSS(pour.end_time_sec)
                    : '—'}
                </span>
                {pour.cumulative_water_g != null && (
                  <span className="tabular-nums">
                    {pour.cumulative_water_g} g
                  </span>
                )}
                {pour.note && (
                  <span className="text-muted-foreground truncate">
                    {pour.note}
                  </span>
                )}
              </li>
            ))}
            {bloomEndSec != null && (
              <li className="text-muted-foreground flex items-baseline gap-3 rounded-md border border-dashed px-3 py-2">
                <span className="shrink-0">悶蒸結束</span>
                <span className="font-mono tabular-nums">
                  {formatSecondsToMSS(bloomEndSec)}
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      {/* 底部固定操作區：按鈕位置永遠不變（FR-13.5 的核心） */}
      <div className="mx-auto w-full max-w-sm space-y-2 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-14 text-base"
            onClick={handleBloomEnd}
            disabled={bloomDone}
          >
            <Droplets className="size-5" />
            {bloomDone ? '悶蒸已記錄' : '悶蒸結束'}
          </Button>
          <Button type="button" className="h-14 text-base" onClick={handleLap}>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStop}
          >
            <Square className="size-4" />
            結束計時
          </Button>
        </div>
      </div>
    </div>
  )
}
