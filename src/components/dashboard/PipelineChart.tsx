'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const STAGE_COLORS: Record<string, string> = {
  New: '#3B82F6',
  Contacted: '#8B5CF6',
  Qualified: '#F59E0B',
  'Proposal Sent': '#06B6D4',
  Negotiation: '#EC4899',
  Won: '#10B981',
  Lost: '#EF4444',
}

interface PipelineChartProps {
  data: { stage: string; count: number; value: number }[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { stage: string; count: number; value: number } }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{d.stage}</p>
      <p className="text-muted-foreground">
        {d.count} lead{d.count !== 1 ? 's' : ''}
      </p>
      {d.value > 0 && (
        <p className="text-green-600 font-medium mt-0.5">{formatCurrency(d.value)}</p>
      )}
    </div>
  )
}

export function PipelineChart({ data }: PipelineChartProps) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pipeline by Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
            No leads in pipeline yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
                vertical={false}
              />
              <XAxis
                dataKey="stage"
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={STAGE_COLORS[entry.stage] ?? '#6B7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
