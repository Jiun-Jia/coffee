'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { updateUsernameAction } from '@/lib/auth/actions'
import { changeUsernameSchema } from '@/lib/validations/auth'

type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>

/** 設定頁的帳號區塊：修改使用者名稱（AUTH-11）。 */
export function AccountSection({
  username,
  email,
}: {
  username: string
  email: string | null
}) {
  const form = useForm<ChangeUsernameInput>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: { username },
  })

  async function onSubmit(values: ChangeUsernameInput) {
    if (values.username === username) return
    const result = await updateUsernameAction(values)
    if (result?.error) {
      form.setError('username', { message: result.error })
      return
    }
    toast.success('使用者名稱已更新')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>帳號</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex max-w-md items-start gap-2"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>使用者名稱</FormLabel>
                  <FormControl>
                    <Input autoComplete="username" {...field} />
                  </FormControl>
                  <FormDescription>
                    顯示為「沖煮人」；改名會同步影響過往紀錄的顯示
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="outline"
              className="mt-[22px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              更新
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
