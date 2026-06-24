import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reset Password' }

// Full implementation in Phase 3
export default function ResetPasswordPage() {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 shadow-2xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-slate-400 mt-1 text-sm">Auth implemented in Phase 3</p>
      </div>
    </div>
  )
}
