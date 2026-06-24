'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updatePasswordSchema, type UpdatePasswordFormValues } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Number', passed: /[0-9]/.test(password) },
  ]

  const passed = checks.filter((c) => c.passed).length
  const strength = passed === 0 ? 0 : passed === 1 ? 33 : passed === 2 ? 66 : 100
  const color =
    strength === 0
      ? 'bg-slate-600'
      : strength <= 33
        ? 'bg-red-500'
        : strength <= 66
          ? 'bg-yellow-500'
          : 'bg-green-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <div className="flex gap-3">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`text-[11px] flex items-center gap-1 ${check.passed ? 'text-green-400' : 'text-slate-500'}`}
          >
            <CheckCircle2 className="h-3 w-3" />
            {check.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function UpdatePasswordForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const passwordValue = form.watch('password')

  async function onSubmit(values: UpdatePasswordFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })

    setIsPending(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 border border-green-500/30 mb-4">
          <Lock className="h-5 w-5 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Set new password</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Choose a strong password for your account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* New password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300 text-sm">New password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isPending}
                      className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 focus-visible:border-green-500/50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <PasswordStrength password={passwordValue} />
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Confirm password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300 text-sm">Confirm new password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      {...field}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isPending}
                      className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 focus-visible:border-green-500/50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold h-11 transition-colors mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
