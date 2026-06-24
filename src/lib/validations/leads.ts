import { z } from 'zod'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/types'

export const leadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(255),
  contact_person: z.string().min(1, 'Contact person is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  source: z.enum(LEAD_SOURCES as [string, ...string[]]),
  deal_value: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more').nullable(),
  ),
  probability: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).max(100).nullable(),
  ),
  lead_score: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0).max(100),
  ),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export type LeadFormValues = z.infer<typeof leadSchema>
