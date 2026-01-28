// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string | null
          role: 'owner' | 'admin' | 'member'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          full_name?: string | null
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          full_name?: string | null
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          event_type: string
          start_date: string
          end_date: string | null
          venue_name: string | null
          venue_address: string | null
          expected_participants: number | null
          budget: number | null
          status: 'draft' | 'active' | 'completed' | 'cancelled'
          settings: Json | null
          registration_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          event_type: string
          start_date: string
          end_date?: string | null
          venue_name?: string | null
          venue_address?: string | null
          expected_participants?: number | null
          budget?: number | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          settings?: Json | null
          registration_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          event_type?: string
          start_date?: string
          end_date?: string | null
          venue_name?: string | null
          venue_address?: string | null
          expected_participants?: number | null
          budget?: number | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          settings?: Json | null
          registration_open?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          event_id: string
          first_name: string
          last_name: string
          phone: string
          phone_normalized: string
          email: string | null
          status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          notes: string | null
          has_companion: boolean
          companion_name: string | null
          companion_phone: string | null
          companion_phone_normalized: string | null
          dietary_restrictions: string | null
          accessibility_needs: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          first_name: string
          last_name: string
          phone: string
          phone_normalized?: string
          email?: string | null
          status?: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          notes?: string | null
          has_companion?: boolean
          companion_name?: string | null
          companion_phone?: string | null
          companion_phone_normalized?: string | null
          dietary_restrictions?: string | null
          accessibility_needs?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          first_name?: string
          last_name?: string
          phone?: string
          phone_normalized?: string
          email?: string | null
          status?: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          notes?: string | null
          has_companion?: boolean
          companion_name?: string | null
          companion_phone?: string | null
          companion_phone_normalized?: string | null
          dietary_restrictions?: string | null
          accessibility_needs?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          organization_id: string
          name: string
          category: string
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          website: string | null
          notes: string | null
          rating: number | null
          is_preferred: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          category: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          website?: string | null
          notes?: string | null
          rating?: number | null
          is_preferred?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          category?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          website?: string | null
          notes?: string | null
          rating?: number | null
          is_preferred?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          event_id: string
          participant_id: string | null
          vendor_id: string | null
          type: string
          channel: 'whatsapp' | 'email' | 'sms'
          recipient_name: string
          recipient_phone: string | null
          recipient_email: string | null
          content: string
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error_message: string | null
          retry_count: number
          external_message_id: string | null
          is_companion: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          participant_id?: string | null
          vendor_id?: string | null
          type: string
          channel?: 'whatsapp' | 'email' | 'sms'
          recipient_name: string
          recipient_phone?: string | null
          recipient_email?: string | null
          content: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          retry_count?: number
          external_message_id?: string | null
          is_companion?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          participant_id?: string | null
          vendor_id?: string | null
          type?: string
          channel?: 'whatsapp' | 'email' | 'sms'
          recipient_name?: string
          recipient_phone?: string | null
          recipient_email?: string | null
          content?: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          retry_count?: number
          external_message_id?: string | null
          is_companion?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      normalize_phone: {
        Args: { phone: string }
        Returns: string
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
