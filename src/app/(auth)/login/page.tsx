import type { Metadata } from 'next'
import { LoginForm } from './_form'

export const metadata: Metadata = { title: 'Sign In' }

interface Props {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirectTo, error } = await searchParams
  return <LoginForm redirectTo={redirectTo ?? '/dashboard'} urlError={error} />
}
