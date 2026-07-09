export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          active: boolean
          brand_name: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          starts_at: string | null
          target_url: string | null
          title: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          brand_name: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          brand_name?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_availability: {
        Row: {
          artist_id: string
          date: string
          id: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          artist_id: string
          date: string
          id?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          artist_id?: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "artist_availability_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          act_type: Database["public"]["Enums"]["act_type"]
          avatar_url: string | null
          base_gage: number
          bio: string | null
          bookings_30d: number
          created_at: string
          equipment: string | null
          genre_id: number | null
          home_city: string | null
          id: string
          instagram_followers: number
          instagram_handle: string | null
          instagram_url: string | null
          lat: number | null
          lng: number | null
          mixcloud_url: string | null
          online: boolean
          rating: number
          response_minutes: number | null
          reviews_count: number
          soundcloud_url: string | null
          spotify_followers: number
          spotify_url: string | null
          stage_name: string
          tiktok_followers: number
          tiktok_handle: string | null
          tiktok_url: string | null
          total_bookings: number
          updated_at: string
          user_id: string | null
          equipment_items: string[]
          has_light: boolean
          has_sound: boolean
          province: string | null
          verified: boolean
        }
        Insert: {
          act_type?: Database["public"]["Enums"]["act_type"]
          avatar_url?: string | null
          base_gage?: number
          bio?: string | null
          bookings_30d?: number
          created_at?: string
          equipment?: string | null
          genre_id?: number | null
          home_city?: string | null
          id?: string
          instagram_followers?: number
          instagram_handle?: string | null
          instagram_url?: string | null
          lat?: number | null
          lng?: number | null
          mixcloud_url?: string | null
          online?: boolean
          rating?: number
          response_minutes?: number | null
          reviews_count?: number
          soundcloud_url?: string | null
          spotify_followers?: number
          spotify_url?: string | null
          stage_name: string
          tiktok_followers?: number
          tiktok_handle?: string | null
          tiktok_url?: string | null
          total_bookings?: number
          updated_at?: string
          user_id?: string | null
          equipment_items?: string[]
          has_light?: boolean
          has_sound?: boolean
          province?: string | null
          verified?: boolean
        }
        Update: {
          act_type?: Database["public"]["Enums"]["act_type"]
          avatar_url?: string | null
          base_gage?: number
          bio?: string | null
          bookings_30d?: number
          created_at?: string
          equipment?: string | null
          genre_id?: number | null
          home_city?: string | null
          id?: string
          instagram_followers?: number
          instagram_handle?: string | null
          instagram_url?: string | null
          lat?: number | null
          lng?: number | null
          mixcloud_url?: string | null
          online?: boolean
          rating?: number
          response_minutes?: number | null
          reviews_count?: number
          soundcloud_url?: string | null
          spotify_followers?: number
          spotify_url?: string | null
          stage_name?: string
          tiktok_followers?: number
          tiktok_handle?: string | null
          tiktok_url?: string | null
          total_bookings?: number
          updated_at?: string
          user_id?: string | null
          equipment_items?: string[]
          has_light?: boolean
          has_sound?: boolean
          province?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "artists_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_genres: {
        Row: {
          artist_id: string
          genre_id: number
        }
        Insert: {
          artist_id: string
          genre_id: number
        }
        Update: {
          artist_id?: string
          genre_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_genres_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_province_rates: {
        Row: {
          artist_id: string
          gage: number
          id: string
          province: string
        }
        Insert: {
          artist_id: string
          gage: number
          id?: string
          province: string
        }
        Update: {
          artist_id?: string
          gage?: number
          id?: string
          province?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_province_rates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_media: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          kind: string
          path: string | null
          url: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          kind?: string
          path?: string | null
          url: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          kind?: string
          path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_media_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: Database["public"]["Enums"]["supplier_category"]
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          day_rate: number | null
          description: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          rating: number
          reviews_count: number
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["supplier_category"]
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          day_rate?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number
          reviews_count?: number
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["supplier_category"]
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          day_rate?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number
          reviews_count?: number
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flags: {
        Row: {
          conversation_id: string | null
          counterparty_id: string | null
          created_at: string
          id: string
          reason: string
          sender_id: string | null
          snippet: string | null
        }
        Insert: {
          conversation_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          id?: string
          reason: string
          sender_id?: string | null
          snippet?: string | null
        }
        Update: {
          conversation_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          sender_id?: string | null
          snippet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          club_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          flyer_url: string | null
          genre_id: number | null
          id: string
          min_age: number | null
          organizer_id: string | null
          published: boolean
          start_time: string | null
          ticket_price: number | null
          ticket_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          flyer_url?: string | null
          genre_id?: number | null
          id?: string
          min_age?: number | null
          organizer_id?: string | null
          published?: boolean
          start_time?: string | null
          ticket_price?: number | null
          ticket_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          flyer_url?: string | null
          genre_id?: number | null
          id?: string
          min_age?: number | null
          organizer_id?: string | null
          published?: boolean
          start_time?: string | null
          ticket_price?: number | null
          ticket_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          created_at: string
          event_id: string
          sort_order: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          event_id: string
          sort_order?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          event_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          artist_id: string
          booker_id: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          city: string | null
          company_name: string | null
          created_at: string
          end_time: string | null
          event_date: string
          gage: number
          id: string
          invoice_email: string | null
          is_public: boolean
          message: string | null
          occasion: string | null
          service_fee: number
          shortlist_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          updated_at: string
          vat_number: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          artist_id: string
          booker_id: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          city?: string | null
          company_name?: string | null
          created_at?: string
          end_time?: string | null
          event_date: string
          gage: number
          id?: string
          invoice_email?: string | null
          is_public?: boolean
          message?: string | null
          occasion?: string | null
          service_fee: number
          shortlist_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          updated_at?: string
          vat_number?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          artist_id?: string
          booker_id?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          city?: string | null
          company_name?: string | null
          created_at?: string
          end_time?: string | null
          event_date?: string
          gage?: number
          id?: string
          invoice_email?: string | null
          is_public?: boolean
          message?: string | null
          occasion?: string | null
          service_fee?: number
          shortlist_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          updated_at?: string
          vat_number?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          artist_id: string
          booker_id: string
          booking_id: string | null
          created_at: string
          flag_reason: string | null
          flagged: boolean
          flagged_at: string | null
          id: string
        }
        Insert: {
          artist_id: string
          booker_id: string
          booking_id?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          id?: string
        }
        Update: {
          artist_id?: string
          booker_id?: string
          booking_id?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          artist_id: string
          booker_id: string
          created_at: string
          id: string
        }
        Insert: {
          artist_id: string
          booker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          artist_id?: string
          booker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          artist_id: string
          booking_id: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          artist_id: string
          booking_id?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          artist_id?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          company: string | null
          company_name: string | null
          created_at: string
          email: string | null
          flag_count: number
          flagged: boolean
          full_name: string | null
          id: string
          invoice_address: string | null
          invoice_email: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_plan: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_trial_end: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          flag_count?: number
          flagged?: boolean
          full_name?: string | null
          id: string
          invoice_address?: string | null
          invoice_email?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_trial_end?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          flag_count?: number
          flagged?: boolean
          full_name?: string | null
          id?: string
          invoice_address?: string | null
          invoice_email?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_trial_end?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artist_id: string
          booker_id: string | null
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_name: string | null
        }
        Insert: {
          artist_id: string
          booker_id?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_name?: string | null
        }
        Update: {
          artist_id?: string
          booker_id?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_artist_owner: { Args: { a_id: string }; Returns: boolean }
    }
    Enums: {
      act_type:
        | "dj"
        | "band"
        | "singer"
        | "mc"
        | "musician"
        | "duo"
        | "other"
      ad_placement: "events_top" | "event_detail" | "discover" | "sidebar"
      availability_status: "available" | "booked"
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
        | "paid"
      booking_type: "prive" | "zakelijk"
      payment_status: "pending" | "held" | "released" | "refunded" | "failed"
      payout_status: "scheduled" | "paid" | "failed"
      supplier_category:
        | "sound"
        | "light"
        | "stage"
        | "dj_gear"
        | "backline"
        | "other"
      subscription_status:
        | "inactive"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
      user_role: "booker" | "artist" | "both" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      act_type: ["dj", "band", "singer", "mc", "musician", "duo", "other"],
      ad_placement: ["events_top", "event_detail", "discover", "sidebar"],
      availability_status: ["available", "booked"],
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
        "paid",
      ],
      booking_type: ["prive", "zakelijk"],
      payment_status: ["pending", "held", "released", "refunded", "failed"],
      payout_status: ["scheduled", "paid", "failed"],
      supplier_category: [
        "sound",
        "light",
        "stage",
        "dj_gear",
        "backline",
        "other",
      ],
      subscription_status: [
        "inactive",
        "trialing",
        "active",
        "past_due",
        "canceled",
      ],
      user_role: ["booker", "artist", "both", "admin"],
    },
  },
} as const
