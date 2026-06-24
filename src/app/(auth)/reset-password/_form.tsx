'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validations/auth'
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

export function ResetPasswordForm() {
  const [isPending, setIsPending] = React.useState(false)
  const [emailSent, setEmailSent] = React.useState(false)
  const [sentToEmail, setSentToEmail] = React.useState('')

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/update-password`
        : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback?next=/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    })

    setIsPending(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSentToEmail(values.email)
    setEmailSent(true)
  }

  // Success state
  if (emailSent) {
    return (
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 text-sm mb-1">
          We sent a password reset link to
        </p>
        <p className="text-white font-medium text-sm mb-6">{sentToEmail}</p>
        <p className="text-slate-500 text-xs mb-6">
          Click the link in the email to reset your password. The link expires in 1 hour.
          Check your spam folder if you don't see it.
        </p>
        <Button
          variant="outline"
          className="w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
          onClick={() => {
            setEmailSent(false)
            form.reset()
          }}
        >
          Send another email
        </Button>
        <Link
          href="/login"
          className="block mt-3 text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold h-11 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </Form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 mt-5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </div>
  )
}
