import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone } from 'lucide-react'
import { nzDateKey } from '@/lib/timezone'

type CallLogRow = { call_outcome: string; call_date: string }

interface OutboundCallDashboardProps {
  logs: CallLogRow[]
}

const OUTCOME_ORDER = [
  'Booked Meeting',
  'Interested',
  'Callback',
  'Not Interested',
  'No Answer',
]

function pct(n: number, total: number) {
  if (total === 0) return '0.00%'
  return `${((n / total) * 100).toFixed(2)}%`
}

// "7/13/2026" from a "YYYY-MM-DD" key (already an NZ calendar date, no further conversion needed)
function shortLabel(dateKey: string) {
  const [y, m, d] = dateKey.split('-')
  return `${Number(m)}/${Number(d)}/${y}`
}

export function OutboundCallDashboard({ logs }: OutboundCallDashboardProps) {
  const total = logs.length

  // ── KPI 1: outcome breakdown ──────────────────────────────────────────────
  const outcomeCounts = new Map<string, number>()
  for (const log of logs) {
    const key = log.call_outcome ?? ''
    outcomeCounts.set(key, (outcomeCounts.get(key) ?? 0) + 1)
  }

  const knownOutcomes = OUTCOME_ORDER.map(o => ({ outcome: o, count: outcomeCounts.get(o) ?? 0 }))
  const knownTotal = knownOutcomes.reduce((s, r) => s + r.count, 0)
  const other = total - knownTotal

  const booked = outcomeCounts.get('Booked Meeting') ?? 0
  const conversion = pct(booked, total)

  const kpi1Rows = [
    ...knownOutcomes,
    { outcome: 'Other / Blank', count: Math.max(0, other) },
  ]

  // ── KPI 2: calls per day, last 7 days (NZ calendar days) ────────────────
  // Anchor on NZ's current calendar date, then step back day-by-day on that
  // same date (pure calendar arithmetic — no further timezone conversion,
  // since the anchor is already NZ's correct "today").
  const nzTodayKey = nzDateKey(new Date())
  const anchor = new Date(`${nzTodayKey}T00:00:00Z`)
  const days: { label: string; dateKey: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor)
    d.setUTCDate(d.getUTCDate() - i)
    const dateKey = d.toISOString().slice(0, 10)
    days.push({ label: shortLabel(dateKey), dateKey })
  }

  const dailyMap = new Map<string, { total: number; booked: number }>()
  for (const log of logs) {
    const key = nzDateKey(log.call_date)
    const existing = dailyMap.get(key) ?? { total: 0, booked: 0 }
    existing.total++
    if (log.call_outcome === 'Booked Meeting') existing.booked++
    dailyMap.set(key, existing)
  }

  const kpi2Rows = days
    .map(({ label, dateKey }) => {
      const day = dailyMap.get(dateKey) ?? { total: 0, booked: 0 }
      return { label, ...day, rate: pct(day.booked, day.total) }
    })
    .filter(r => r.total > 0)
    .reverse()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-green-600" />
          Outbound Call Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">

          {/* KPI 1 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              KPI 1 — Conversion Rate
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="px-3 py-2 text-left font-medium text-xs">Metric</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Count</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Total row */}
                  <tr className="bg-muted/20">
                    <td className="px-3 py-2 font-medium text-xs">Total Calls Made</td>
                    <td className="px-3 py-2 text-right font-semibold text-xs">{total}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">100%</td>
                  </tr>

                  {/* Per-outcome rows */}
                  {kpi1Rows.map(({ outcome, count }) => (
                    <tr key={outcome} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs">{outcome}</td>
                      <td className="px-3 py-2 text-right text-xs">{count}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {pct(count, total)}
                      </td>
                    </tr>
                  ))}

                  {/* Conversion highlight row */}
                  <tr className="bg-green-50 dark:bg-green-950/30">
                    <td className="px-3 py-2 font-bold text-xs text-green-700 dark:text-green-400">
                      CONVERSION
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-xs text-green-700 dark:text-green-400">
                      {booked}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-xs text-green-700 dark:text-green-400">
                      {conversion}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 2 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              KPI 2 — Calls Per Day (Last 7 Days)
            </p>
            {kpi2Rows.length === 0 ? (
              <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                No calls in the last 7 days
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="px-3 py-2 text-left font-medium text-xs">Date</th>
                      <th className="px-3 py-2 text-right font-medium text-xs">Calls</th>
                      <th className="px-3 py-2 text-right font-medium text-xs">Booked</th>
                      <th className="px-3 py-2 text-right font-medium text-xs">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kpi2Rows.map(row => (
                      <tr key={row.label} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs">{row.label}</td>
                        <td className="px-3 py-2 text-right text-xs font-medium">{row.total}</td>
                        <td className="px-3 py-2 text-right text-xs text-green-600 font-medium">
                          {row.booked}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {row.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
