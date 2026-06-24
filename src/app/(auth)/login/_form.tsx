'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
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

interface LoginFormProps {
  redirectTo: string
  urlError?: string
}

const URL_ERROR_MESSAGES: Record<string, string> = {
  'link-expired': 'Your reset link has expired. Please request a new one.',
  'auth-failed': 'Authentication failed. Please try again.',
}

export function LoginForm({ redirectTo, urlError }: LoginFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message
      )
      setIsPending(false)
      return
    }

    toast.success('Signed in successfully')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Sign in to your Acendia CRM account
        </p>
      </div>

      {/* URL error banner */}
      {urlError && URL_ERROR_MESSAGES[urlError] && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{URL_ERROR_MESSAGES[urlError]}</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300 text-sm">Email address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      disabled={isPending}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 focus-visible:border-green-500/50"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-slate-300 text-sm">Password</FormLabel>
                  <Link
                    href="/reset-password"
                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isPending}
                      className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 focus-visible:border-green-500/50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold mt-2 h-11 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>

      {/* Footer */}
      <p className="text-center text-xs text-slate-500 mt-6">
        Having trouble?{' '}
        <a
          href="mailto:support@acendia.com"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Contact your admin
        </a>
      </p>
    </div>
  )
}
