'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface MonthlyData {
  month: string
  won: number
  lost: number
  value: number
}

interface MonthlyDealsChartProps {
  data: MonthlyData[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; payload: MonthlyData }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const won = payload.find((p) => p.dataKey === 'won')
  const lost = payload.find((p) => p.dataKey === 'lost')
  const value = payload[0]?.payload?.value

  return (
    <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {won && (
        <p className="text-emerald-600">
          Won: <span className="font-medium">{won.value}</span>
        </p>
      )}
      {lost && (
        <p className="text-red-500">
          Lost: <span className="font-medium">{lost.value}</span>
        </p>
      )}
      {value > 0 && (
        <p className="text-muted-foreground text-xs pt-0.5">
          Revenue: {formatCurrency(value)}
        </p>
      )}
    </div>
  )
}

export function MonthlyDealsChart({ data }: MonthlyDealsChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Monthly Closed Deals — Last 6 Months
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="wonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lostGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.15)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.2)', strokeWidth: 1 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground capitalize">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="won"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#wonGradient)"
              name="Won"
              dot={{ fill: '#10B981', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="lost"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#lostGradient)"
              name="Lost"
              dot={{ fill: '#EF4444', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
