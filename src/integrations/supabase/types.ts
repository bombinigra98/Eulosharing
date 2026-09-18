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
      admin_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          arrival_time: string
          default_departure_address: string
          default_departure_lat: number | null
          default_departure_lng: number | null
          default_departure_name: string
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string
          id: boolean
          one_way_km: number
          updated_at: string
        }
        Insert: {
          arrival_time?: string
          default_departure_address?: string
          default_departure_lat?: number | null
          default_departure_lng?: number | null
          default_departure_name?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string
          id?: boolean
          one_way_km?: number
          updated_at?: string
        }
        Update: {
          arrival_time?: string
          default_departure_address?: string
          default_departure_lat?: number | null
          default_departure_lng?: number | null
          default_departure_name?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string
          id?: boolean
          one_way_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          arrival_at: string | null
          candidates: number
          created_at: string
          created_by: string | null
          day: string
          departure_address: string
          departure_at: string | null
          departure_lat: number | null
          departure_lng: number | null
          departure_name: string
          distance_km: number | null
          driver_id: string
          fuel_price: number | null
          fuel_type: string | null
          id: string
          travel_minutes: number | null
          trip_cost: number | null
        }
        Insert: {
          arrival_at?: string | null
          candidates?: number
          created_at?: string
          created_by?: string | null
          day: string
          departure_address?: string
          departure_at?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_name?: string
          distance_km?: number | null
          driver_id: string
          fuel_price?: number | null
          fuel_type?: string | null
          id?: string
          travel_minutes?: number | null
          trip_cost?: number | null
        }
        Update: {
          arrival_at?: string | null
          candidates?: number
          created_at?: string
          created_by?: string | null
          day?: string
          departure_address?: string
          departure_at?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_name?: string
          distance_km?: number | null
          driver_id?: string
          fuel_price?: number | null
          fuel_type?: string | null
          id?: string
          travel_minutes?: number | null
          trip_cost?: number | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          day: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_prices: {
        Row: {
          fuel_type: string
          id: string
          price: number
          province: string
          sample_size: number
          updated_at: string
        }
        Insert: {
          fuel_type: string
          id?: string
          price: number
          province: string
          sample_size?: number
          updated_at?: string
        }
        Update: {
          fuel_type?: string
          id?: string
          price?: number
          province?: string
          sample_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          day: string | null
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          day?: string | null
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          day?: string | null
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          alarm_lead_minutes: number
          car_model: string
          city: string
          consumption_kml: number
          created_at: string
          email: string
          fuel_type: string
          full_name: string
          id: string
          prep_minutes: number
          province: string
          seats: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          alarm_lead_minutes?: number
          car_model?: string
          city?: string
          consumption_kml?: number
          created_at?: string
          email?: string
          fuel_type?: string
          full_name?: string
          id: string
          prep_minutes?: number
          province?: string
          seats?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          alarm_lead_minutes?: number
          car_model?: string
          city?: string
          consumption_kml?: number
          created_at?: string
          email?: string
          fuel_type?: string
          full_name?: string
          id?: string
          prep_minutes?: number
          province?: string
          seats?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sos_requests: {
        Row: {
          created_at: string
          day: string
          handled_by: string | null
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          handled_by?: string | null
          id?: string
          reason?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          handled_by?: string | null
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
