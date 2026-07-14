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
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ComboboxInput } from '@/components/forms/combobox-input'
import {
  createGrinder,
  deleteGrinder,
  updateGrinder,
} from '@/app/(app)/settings/actions'
import { GRINDER_PRESETS } from '@/lib/presets'
import type { GrinderWithCount } from '@/lib/queries/grinders'
import { grinderSchema, type GrinderInput } from '@/lib/validations/grinder'

type GroupOption = { id: string; name: string }

function GrinderFormDialog({
  grinder,
  groups,
  trigger,
}: {
  grinder?: GrinderWithCount
  groups: GroupOption[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [groupId, setGroupId] = useState('') // ''＝個人（僅新增時可選）
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
      : await createGrinder(values, groupId || undefined)

    if (!result.ok) {
      form.setError('name', { message: result.error })
      return
    }
    toast.success(grinder ? '磨豆機已更新' : '磨豆機已新增')
    setOpen(false)
    if (!grinder) {
      form.reset()
      setGroupId('')
    }
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
                      onChange={field.onChange}
                      options={[...GRINDER_PRESETS]}
                      placeholder="選擇常見機種或自行輸入"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!grinder && groups.length > 0 && (
              <FormItem>
                <FormLabel>歸屬</FormLabel>
                <Select
                  value={groupId === '' ? '__personal' : groupId}
                  onValueChange={(v) =>
                    setGroupId(v === '__personal' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__personal">個人</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        群組：{g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
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

/** 設定頁磨豆機管理（BEAN-8 + FR-10.9 群組共用）。 */
export function GrinderManager({
  grinders,
  groups,
  myUserId,
}: {
  grinders: GrinderWithCount[]
  groups: GroupOption[]
  myUserId: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>磨豆機</CardTitle>
        <CardDescription>
          沖煮紀錄的「刻度」會綁定磨豆機解讀；群組磨豆機全體成員可選用
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
              <p className="text-sm font-medium">
                {grinder.name}
                {grinder.group_name && (
                  <Badge variant="outline" className="ml-2">
                    {grinder.group_name}
                  </Badge>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                {[grinder.burr_type, `${grinder.brew_count} 筆沖煮`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {grinder.user_id === myUserId && (
              <div className="flex gap-1">
                <GrinderFormDialog
                  grinder={grinder}
                  groups={groups}
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
            )}
          </div>
        ))}
        <GrinderFormDialog
          groups={groups}
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
