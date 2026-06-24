import type { Metadata } from 'next'
import { UpdatePasswordForm } from './_form'

export const metadata: Metadata = { title: 'Set New Password' }

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
