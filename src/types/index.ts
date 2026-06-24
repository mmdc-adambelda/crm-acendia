import type { Tables, Enums } from './database.types'

// ─── Re-exported Row types ───────────────────────────────────────────────────
export type Profile = Tables<'profiles'>
export type Lead = Tables<'leads'>
export type Task = Tables<'tasks'>
export type CallLog = Tables<'call_logs'>
export type Client = Tables<'clients'>
export type Note = Tables<'notes'>
export type Activity = Tables<'activities'>

// ─── Enum types ──────────────────────────────────────────────────────────────
export type UserRole = Enums<'user_role'>
export type LeadStatus = Enums<'lead_status'>
export type LeadSource = Enums<'lead_source'>
export type TaskStatus = Enums<'task_status'>
export type TaskPriority = Enums<'task_priority'>
export type CallOutcome = Enums<'call_outcome'>
export type OnboardingStatus = Enums<'onboarding_status'>
export type ActivityType = Enums<'activity_type'>

// ─── Joined / enriched types ─────────────────────────────────────────────────
export type LeadWithAssignee = Lead & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type TaskWithRelations = Task & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  lead: Pick<Lead, 'id' | 'company_name' | 'contact_person'> | null
  client: Pick<Client, 'id' | 'company' | 'contact_person'> | null
}

export type CallLogWithRelations = CallLog & {
  lead: Pick<Lead, 'id' | 'company_name' | 'contact_person'> | null
  made_by_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type ClientWithAssignee = Client & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  lead: Pick<Lead, 'id' | 'company_name'> | null
}

export type ActivityWithProfile = Activity & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ─── Dashboard KPI types ─────────────────────────────────────────────────────
export interface DashboardKPIs {
  totalLeads: number
  qualifiedLeads: number
  activeDeals: number
  closedWon: number
  closedLost: number
  revenuePipeline: number
  conversionRate: number
  callsMadeToday: number
}

export interface PipelineStageValue {
  stage: LeadStatus
  value: number
  count: number
}

export interface LeadsBySource {
  source: LeadSource
  count: number
}

export interface MonthlyDeals {
  month: string
  won: number
  lost: number
  value: number
}

// ─── UI / utility types ──────────────────────────────────────────────────────
export interface SelectOption {
  label: string
  value: string
}

export interface FilterState {
  search: string
  status: LeadStatus | ''
  source: LeadSource | ''
  assignedTo: string
  dateFrom: string
  dateTo: string
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
]

export const LEAD_SOURCES: LeadSource[] = [
  'Website',
  'Referral',
  'Cold Outreach',
  'LinkedIn',
  'Facebook Ads',
  'Google Ads',
  'Email Campaign',
  'Event',
  'Other',
]

export const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Done']

export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent']

export const CALL_OUTCOMES: CallOutcome[] = [
  'No Answer',
  'Interested',
  'Not Interested',
  'Callback',
  'Booked Meeting',
]

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'bdm', label: 'Business Development Manager' },
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'client_success_manager', label: 'Client Success Manager' },
]

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Marketing & Advertising',
  'Legal',
  'Hospitality',
  'Construction',
  'Transportation',
  'Media & Entertainment',
  'Non-Profit',
  'Government',
  'Other',
]
