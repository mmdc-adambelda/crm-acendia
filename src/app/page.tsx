import { redirect } from 'next/navigation'

// Middleware handles the actual redirect logic.
// This page is a safety-net in case middleware doesn't run.
export default function RootPage() {
  redirect('/login')
}
