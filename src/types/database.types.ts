export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: Database['public']['Enums']['user_role']
          phone: string | null
          department: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: Database['public']['Enums']['user_role']
          phone?: string | null
          department?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: Database['public']['Enums']['user_role']
          phone?: string | null
          department?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          company_name: string
          contact_person: string
          email: string
          phone: string | null
          website: string | null
          industry: string | null
          location: string | null
          notes: string | null
          lead_score: number
          source: Database['public']['Enums']['lead_source']
          assigned_to: string | null
          status: Database['public']['Enums']['lead_status']
          deal_value: number | null
          probability: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_person: string
          email: string
          phone?: string | null
          website?: string | null
          industry?: string | null
          location?: string | null
          notes?: string | null
          lead_score?: number
          source?: Database['public']['Enums']['lead_source']
          assigned_to?: string | null
          status?: Database['public']['Enums']['lead_status']
          deal_value?: number | null
          probability?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_person?: string
          email?: string
          phone?: string | null
          website?: string | null
          industry?: string | null
          location?: string | null
          notes?: string | null
          lead_score?: number
          source?: Database['public']['Enums']['lead_source']
          assigned_to?: string | null
          status?: Database['public']['Enums']['lead_status']
          deal_value?: number | null
          probability?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string | null
          assigned_to: string | null
          lead_id: string | null
          client_id: string | null
          priority: Database['public']['Enums']['task_priority']
          status: Database['public']['Enums']['task_status']
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date?: string | null
          assigned_to?: string | null
          lead_id?: string | null
          client_id?: string | null
          priority?: Database['public']['Enums']['task_priority']
          status?: Database['public']['Enums']['task_status']
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          assigned_to?: string | null
          lead_id?: string | null
          client_id?: string | null
          priority?: Database['public']['Enums']['task_priority']
          status?: Database['public']['Enums']['task_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      call_logs: {
        Row: {
          id: string
          lead_id: string
          call_date: string
          call_outcome: Database['public']['Enums']['call_outcome']
          duration: number | null
          notes: string | null
          follow_up_date: string | null
          made_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          call_date: string
          call_outcome: Database['public']['Enums']['call_outcome']
          duration?: number | null
          notes?: string | null
          follow_up_date?: string | null
          made_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          call_date?: string
          call_outcome?: Database['public']['Enums']['call_outcome']
          duration?: number | null
          notes?: string | null
          follow_up_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'call_logs_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'call_logs_made_by_fkey'
            columns: ['made_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          id: string
          lead_id: string | null
          company: string
          contact_person: string
          email: string
          phone: string | null
          package: string | null
          monthly_retainer: number | null
          onboarding_status: Database['public']['Enums']['onboarding_status']
          contract_start: string | null
          contract_end: string | null
          assigned_to: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          company: string
          contact_person: string
          email: string
          phone?: string | null
          package?: string | null
          monthly_retainer?: number | null
          onboarding_status?: Database['public']['Enums']['onboarding_status']
          contract_start?: string | null
          contract_end?: string | null
          assigned_to?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          company?: string
          contact_person?: string
          email?: string
          phone?: string | null
          package?: string | null
          monthly_retainer?: number | null
          onboarding_status?: Database['public']['Enums']['onboarding_status']
          contract_start?: string | null
          contract_end?: string | null
          assigned_to?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clients_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          id: string
          content: string
          lead_id: string | null
          client_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          lead_id?: string | null
          client_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          lead_id?: string | null
          client_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      activities: {
        Row: {
          id: string
          type: Database['public']['Enums']['activity_type']
          description: string
          lead_id: string | null
          client_id: string | null
          created_by: string | null
          created_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          type: Database['public']['Enums']['activity_type']
          description: string
          lead_id?: string | null
          client_id?: string | null
          created_by?: string | null
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          type?: Database['public']['Enums']['activity_type']
          description?: string
          lead_id?: string | null
          client_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'activities_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role:
        | 'super_admin'
        | 'admin'
        | 'bdm'
        | 'sales_rep'
        | 'operations_manager'
        | 'client_success_manager'
      lead_status:
        | 'New'
        | 'Contacted'
        | 'Qualified'
        | 'Proposal Sent'
        | 'Negotiation'
        | 'Won'
        | 'Lost'
      lead_source:
        | 'Website'
        | 'Referral'
        | 'Cold Outreach'
        | 'LinkedIn'
        | 'Facebook Ads'
        | 'Google Ads'
        | 'Email Campaign'
        | 'Event'
        | 'Other'
      task_status: 'Pending' | 'In Progress' | 'Done'
      task_priority: 'Low' | 'Medium' | 'High' | 'Urgent'
      call_outcome:
        | 'No Answer'
        | 'Interested'
        | 'Not Interested'
        | 'Callback'
        | 'Booked Meeting'
      onboarding_status: 'Pending' | 'In Progress' | 'Completed'
      activity_type:
        | 'lead_created'
        | 'lead_updated'
        | 'status_changed'
        | 'note_added'
        | 'call_logged'
        | 'task_created'
        | 'task_completed'
        | 'email_sent'
        | 'meeting_booked'
        | 'deal_won'
        | 'deal_lost'
        | 'client_created'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
