import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LeadScoreBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { LeadStatus } from '@/types'

type DashboardLead = {
  id: string
  company_name: string
  contact_person: string
  status: string
  source: string
  deal_value: number | null
  lead_score: number
  created_at: string
}

export function RecentLeads({ leads }: { leads: DashboardLead[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent Leads
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <Link href="/leads">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No leads yet. <Link href="/leads/new" className="text-primary hover:underline">Add your first lead →</Link>
          </p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {lead.company_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{lead.contact_person}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={lead.status as LeadStatus} />
                  {lead.deal_value ? (
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatCurrency(lead.deal_value)}
                    </span>
                  ) : (
                    <LeadScoreBadge score={lead.lead_score} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
