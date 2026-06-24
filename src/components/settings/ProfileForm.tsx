'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { USER_ROLES } from '@/types'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().max(50).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

type ProfileData = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  department: string | null
  role: string
}

interface ProfileFormProps {
  profile: ProfileData
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [profilePending, setProfilePending] = React.useState(false)
  const [passwordPending, setPasswordPending] = React.useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      department: profile.department ?? '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onProfileSubmit(values: ProfileFormValues) {
    setProfilePending(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({
      full_name: values.full_name,
      phone: values.phone || null,
      department: values.department || null,
    }).eq('id', profile.id)
    setProfilePending(false)
    if (error) { toast.error(error.message); return }
    toast.success('Profile updated')
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setPasswordPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setPasswordPending(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated successfully')
    passwordForm.reset()
  }

  const roleName = USER_ROLES.find(r => r.value === profile.role)?.label ?? profile.role

  return (
    <div className="space-y-8 max-w-lg">
      {/* Profile info */}
      <div>
        <h2 className="text-base font-semibold mb-4">Personal Information</h2>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile.email} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Input value={roleName} disabled className="bg-muted/50" />
            </div>

            <FormField
              control={profileForm.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Your name" disabled={profilePending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="+1 555 0100" disabled={profilePending} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="Sales" disabled={profilePending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={profilePending} className="w-full sm:w-auto">
              {profilePending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Profile'}
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Change password */}
      <div>
        <h2 className="text-base font-semibold mb-4">Change Password</h2>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Min 8 characters" disabled={passwordPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Re-enter password" disabled={passwordPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="outline" disabled={passwordPending} className="w-full sm:w-auto">
              {passwordPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : 'Update Password'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
