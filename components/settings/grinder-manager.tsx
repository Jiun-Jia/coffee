'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ComboboxInput } from '@/components/forms/combobox-input'
import {
  createGrinder,
  deleteGrinder,
  updateGrinder,
} from '@/app/(app)/settings/actions'
import { GRINDER_PRESETS } from '@/lib/presets'
import type { GrinderWithCount } from '@/lib/queries/grinders'
import { grinderSchema, type GrinderInput } from '@/lib/validations/grinder'

function GrinderFormDialog({
  grinder,
  trigger,
}: {
  grinder?: GrinderWithCount
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<GrinderInput>({
    resolver: zodResolver(grinderSchema),
    defaultValues: {
      name: grinder?.name ?? '',
      burr_type: grinder?.burr_type ?? '',
      notes: grinder?.notes ?? '',
    },
  })

  async function onSubmit(values: GrinderInput) {
    const result = grinder
      ? await updateGrinder(grinder.id, values)
      : await createGrinder(values)

    if (!result.ok) {
      form.setError('name', { message: result.error })
      return
    }
    toast.success(grinder ? '磨豆機已更新' : '磨豆機已新增')
    setOpen(false)
    if (!grinder) form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{grinder ? '編輯磨豆機' : '新增磨豆機'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名稱 *</FormLabel>
                  <FormControl>
                    <ComboboxInput
                      value={field.value}
                      onChange={(name) => {
                        field.onChange(name)
                        // 選中預設機種 → 自動帶入刀盤類型與備註
                        const preset = GRINDER_PRESETS.find(
                          (p) => p.name === name,
                        )
                        if (preset) {
                          form.setValue('burr_type', preset.burr_type)
                          form.setValue('notes', preset.notes)
                        }
                      }}
                      options={GRINDER_PRESETS.map((p) => p.name)}
                      placeholder="選擇常見機種或自行輸入"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="burr_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>刀盤類型</FormLabel>
                  <FormControl>
                    <Input placeholder="例：錐刀" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備註</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {grinder ? '儲存' : '新增'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteGrinderButton({ grinder }: { grinder: GrinderWithCount }) {
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    const result = await deleteGrinder(grinder.id)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已刪除「${grinder.name}」`)
    setDeleting(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`刪除 ${grinder.name}`}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除磨豆機？</AlertDialogTitle>
          <AlertDialogDescription>
            {grinder.brew_count > 0
              ? `有 ${grinder.brew_count} 筆沖煮使用「${grinder.name}」，刪除後這些紀錄將失去磨豆機綁定（刻度文字保留）。`
              : `將刪除「${grinder.name}」。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={deleting}>
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** 設定頁磨豆機管理（BEAN-8）。僅個人磨豆機；群組共用的在群組卡片管理（FR-10.9b）。 */
export function GrinderManager({ grinders }: { grinders: GrinderWithCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>磨豆機</CardTitle>
        <CardDescription>
          沖煮紀錄的「刻度」會綁定磨豆機解讀；群組共用磨豆機請到「群組」頁新增
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {grinders.length === 0 && (
          <p className="text-muted-foreground text-sm">
            還沒有磨豆機。新增後即可在沖煮紀錄選用。
          </p>
        )}
        {grinders.map((grinder) => (
          <div
            key={grinder.id}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{grinder.name}</p>
              <p className="text-muted-foreground text-xs">
                {[grinder.burr_type, `${grinder.brew_count} 筆沖煮`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="flex gap-1">
              <GrinderFormDialog
                grinder={grinder}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`編輯 ${grinder.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <DeleteGrinderButton grinder={grinder} />
            </div>
          </div>
        ))}
        <GrinderFormDialog
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="size-4" />
              新增磨豆機
            </Button>
          }
        />
      </CardContent>
    </Card>
  )
}
