'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { checkUsernameAvailable, registerAction } from '@/lib/auth/actions'
import {
  registerSchema,
  USERNAME_PATTERN,
  type RegisterInput,
} from '@/lib/validations/auth'

type Availability = 'idle' | 'checking' | 'available' | 'taken'

export function RegisterForm() {
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const [availability, setAvailability] = useState<Availability>('idle')
  const username = useWatch({ control: form.control, name: 'username' })

  // AUTH-3：debounce 預檢 username 可用性（DB unique index 為最後防線）。
  // setState 全部放在 timer 的非同步邊界內（react-hooks/set-state-in-effect），
  // cancelled flag 避免過期回應覆寫新輸入的狀態。
  useEffect(() => {
    const normalized = username.trim().toLowerCase()
    const valid = USERNAME_PATTERN.test(normalized)
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!valid) {
        if (!cancelled) setAvailability('idle')
        return
      }
      if (!cancelled) setAvailability('checking')
      const ok = await checkUsernameAvailable(normalized)
      if (!cancelled) setAvailability(ok ? 'available' : 'taken')
    }, valid ? 400 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username])

  async function onSubmit(values: RegisterInput) {
    const result = await registerAction(values)
    if (result?.error) {
      form.setError('root', { message: result.error })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>註冊</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>使用者名稱</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        autoComplete="username"
                        placeholder="coffee_lover"
                        {...field}
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        {availability === 'checking' && (
                          <Loader2 className="text-muted-foreground size-4 animate-spin" />
                        )}
                        {availability === 'available' && (
                          <Check className="size-4 text-green-600" />
                        )}
                        {availability === 'taken' && (
                          <X className="text-destructive size-4" />
                        )}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    3–20 字元的小寫英文、數字、_ 或 -；將顯示為「沖煮人」
                  </FormDescription>
                  {availability === 'taken' && (
                    <p className="text-destructive text-sm">
                      這個使用者名稱已被使用
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密碼</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>確認密碼</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || availability === 'taken'}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              建立帳號
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          已經有帳號了？{' '}
          <Link href="/login" className="text-foreground underline">
            登入
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
