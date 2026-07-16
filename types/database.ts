export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      beans: {
        Row: {
          agtron: number | null
          altitude: string | null
          archived_at: string | null
          created_at: string
          farm: string | null
          group_id: string | null
          id: string
          name_batch: string
          notes: string | null
          origin: string
          photo_path: string | null
          price: number | null
          process: string | null
          public_slug: string | null
          purchase_weight_g: number | null
          roast_date: string
          roast_level: Database["public"]["Enums"]["roast_level"]
          roaster: string
          updated_at: string
          user_id: string
          varietal: string | null
        }
        Insert: {
          agtron?: number | null
          altitude?: string | null
          archived_at?: string | null
          created_at?: string
          farm?: string | null
          group_id?: string | null
          id?: string
          name_batch: string
          notes?: string | null
          origin: string
          photo_path?: string | null
          price?: number | null
          process?: string | null
          public_slug?: string | null
          purchase_weight_g?: number | null
          roast_date: string
          roast_level: Database["public"]["Enums"]["roast_level"]
          roaster: string
          updated_at?: string
          user_id: string
          varietal?: string | null
        }
        Update: {
          agtron?: number | null
          altitude?: string | null
          archived_at?: string | null
          created_at?: string
          farm?: string | null
          group_id?: string | null
          id?: string
          name_batch?: string
          notes?: string | null
          origin?: string
          photo_path?: string | null
          price?: number | null
          process?: string | null
          public_slug?: string | null
          purchase_weight_g?: number | null
          roast_date?: string
          roast_level?: Database["public"]["Enums"]["roast_level"]
          roaster?: string
          updated_at?: string
          user_id?: string
          varietal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_flavor_tags: {
        Row: {
          brew_id: string
          tag_id: string
        }
        Insert: {
          brew_id: string
          tag_id: string
        }
        Update: {
          brew_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brew_flavor_tags_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brew_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_flavor_tags_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_flavor_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "flavor_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_pours: {
        Row: {
          brew_id: string
          cumulative_water_g: number | null
          end_time_sec: number | null
          id: string
          note: string | null
          seq: number
        }
        Insert: {
          brew_id: string
          cumulative_water_g?: number | null
          end_time_sec?: number | null
          id?: string
          note?: string | null
          seq: number
        }
        Update: {
          brew_id?: string
          cumulative_water_g?: number | null
          end_time_sec?: number | null
          id?: string
          note?: string | null
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "brew_pours_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brew_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_pours_brew_id_fkey"
            columns: ["brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
        ]
      }
      brews: {
        Row: {
          acidity: number | null
          aftertaste: number | null
          aroma: number | null
          balance: number | null
          bean_id: string
          bitterness: number | null
          bloom_time_sec: number | null
          bloom_water_g: number | null
          body: number | null
          brew_type: Database["public"]["Enums"]["brew_type"]
          brewed_at: string
          created_at: string
          dose_g: number
          dripper: string | null
          filter: string | null
          flavor_notes: string | null
          grind_setting: string | null
          grinder_id: string | null
          ice_g: number | null
          id: string
          kettle: string | null
          next_adjustment: string | null
          notes: string | null
          overall: number
          photo_path: string | null
          pour_notes: string | null
          public_slug: string | null
          ratio_include_ice: boolean
          sweetness: number | null
          total_time_sec: number | null
          updated_at: string
          user_id: string
          water_g: number
          water_temp: number | null
        }
        Insert: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          balance?: number | null
          bean_id: string
          bitterness?: number | null
          bloom_time_sec?: number | null
          bloom_water_g?: number | null
          body?: number | null
          brew_type?: Database["public"]["Enums"]["brew_type"]
          brewed_at?: string
          created_at?: string
          dose_g: number
          dripper?: string | null
          filter?: string | null
          flavor_notes?: string | null
          grind_setting?: string | null
          grinder_id?: string | null
          ice_g?: number | null
          id?: string
          kettle?: string | null
          next_adjustment?: string | null
          notes?: string | null
          overall: number
          photo_path?: string | null
          pour_notes?: string | null
          public_slug?: string | null
          ratio_include_ice?: boolean
          sweetness?: number | null
          total_time_sec?: number | null
          updated_at?: string
          user_id: string
          water_g: number
          water_temp?: number | null
        }
        Update: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          balance?: number | null
          bean_id?: string
          bitterness?: number | null
          bloom_time_sec?: number | null
          bloom_water_g?: number | null
          body?: number | null
          brew_type?: Database["public"]["Enums"]["brew_type"]
          brewed_at?: string
          created_at?: string
          dose_g?: number
          dripper?: string | null
          filter?: string | null
          flavor_notes?: string | null
          grind_setting?: string | null
          grinder_id?: string | null
          ice_g?: number | null
          id?: string
          kettle?: string | null
          next_adjustment?: string | null
          notes?: string | null
          overall?: number
          photo_path?: string | null
          pour_notes?: string | null
          public_slug?: string | null
          ratio_include_ice?: boolean
          sweetness?: number | null
          total_time_sec?: number | null
          updated_at?: string
          user_id?: string
          water_g?: number
          water_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brews_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          kind: Database["public"]["Enums"]["equipment_kind"]
          name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["equipment_kind"]
          name: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["equipment_kind"]
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flavor_tags: {
        Row: {
          category: string
          created_at: string
          group_id: string | null
          id: string
          name: string
          owner_user_id: string | null
          scope: Database["public"]["Enums"]["tag_scope"]
        }
        Insert: {
          category: string
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          scope?: Database["public"]["Enums"]["tag_scope"]
        }
        Update: {
          category?: string
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          scope?: Database["public"]["Enums"]["tag_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "flavor_tags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flavor_tags_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grinders: {
        Row: {
          burr_type: string | null
          created_at: string
          group_id: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          burr_type?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          burr_type?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grinders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grinders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          bloom_time_sec: number | null
          bloom_water_g: number | null
          brew_type: Database["public"]["Enums"]["brew_type"]
          created_at: string
          dose_g: number | null
          dripper: string | null
          filter: string | null
          grind_setting: string | null
          grinder_id: string | null
          group_id: string | null
          ice_g: number | null
          id: string
          kettle: string | null
          name: string
          notes: string | null
          pour_notes: string | null
          pours: Json
          ratio_include_ice: boolean
          source_brew_id: string | null
          status: string
          total_time_sec: number | null
          updated_at: string
          user_id: string
          water_g: number | null
          water_temp: number | null
        }
        Insert: {
          bloom_time_sec?: number | null
          bloom_water_g?: number | null
          brew_type?: Database["public"]["Enums"]["brew_type"]
          created_at?: string
          dose_g?: number | null
          dripper?: string | null
          filter?: string | null
          grind_setting?: string | null
          grinder_id?: string | null
          group_id?: string | null
          ice_g?: number | null
          id?: string
          kettle?: string | null
          name: string
          notes?: string | null
          pour_notes?: string | null
          pours?: Json
          ratio_include_ice?: boolean
          source_brew_id?: string | null
          status?: string
          total_time_sec?: number | null
          updated_at?: string
          user_id: string
          water_g?: number | null
          water_temp?: number | null
        }
        Update: {
          bloom_time_sec?: number | null
          bloom_water_g?: number | null
          brew_type?: Database["public"]["Enums"]["brew_type"]
          created_at?: string
          dose_g?: number | null
          dripper?: string | null
          filter?: string | null
          grind_setting?: string | null
          grinder_id?: string | null
          group_id?: string | null
          ice_g?: number | null
          id?: string
          kettle?: string | null
          name?: string
          notes?: string | null
          pour_notes?: string | null
          pours?: Json
          ratio_include_ice?: boolean
          source_brew_id?: string | null
          status?: string
          total_time_sec?: number | null
          updated_at?: string
          user_id?: string
          water_g?: number | null
          water_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_source_brew_id_fkey"
            columns: ["source_brew_id"]
            isOneToOne: false
            referencedRelation: "brew_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_source_brew_id_fkey"
            columns: ["source_brew_id"]
            isOneToOne: false
            referencedRelation: "brews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_suggestions: {
        Row: {
          category: string | null
          created_at: string
          group_id: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["suggestion_status"]
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_suggestions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bean_usage: {
        Row: {
          avg_dose_g: number | null
          bean_id: string | null
          brew_count: number | null
          total_dose_g: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brews_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_details: {
        Row: {
          acidity: number | null
          aftertaste: number | null
          aroma: number | null
          balance: number | null
          bean_id: string | null
          bitterness: number | null
          bloom_time_sec: number | null
          bloom_water_g: number | null
          body: number | null
          brew_type: Database["public"]["Enums"]["brew_type"] | null
          brewed_at: string | null
          brewer_username: string | null
          created_at: string | null
          dose_g: number | null
          dripper: string | null
          filter: string | null
          flavor_notes: string | null
          grind_setting: string | null
          grinder_id: string | null
          group_id: string | null
          ice_g: number | null
          id: string | null
          kettle: string | null
          name_batch: string | null
          next_adjustment: string | null
          notes: string | null
          origin: string | null
          overall: number | null
          photo_path: string | null
          pour_notes: string | null
          process: string | null
          public_slug: string | null
          ratio_include_ice: boolean | null
          ratio_value: number | null
          rest_days: number | null
          roast_date: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          roaster: string | null
          sweetness: number | null
          total_time_sec: number | null
          updated_at: string | null
          user_id: string | null
          varietal: string | null
          water_g: number | null
          water_temp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_pending_join_request: { Args: { gid: string }; Returns: boolean }
      is_group_manager: { Args: { gid: string }; Returns: boolean }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      is_group_owner: { Args: { gid: string }; Returns: boolean }
      requested_my_group: { Args: { other: string }; Returns: boolean }
      shares_group_with: { Args: { other: string }; Returns: boolean }
      tag_on_visible_brew: { Args: { tid: string }; Returns: boolean }
    }
    Enums: {
      brew_type: "pour_over" | "iced_pour_over"
      equipment_kind: "dripper" | "filter" | "kettle"
      roast_level: "light" | "medium_light" | "medium" | "medium_dark" | "dark"
      suggestion_status: "pending" | "approved" | "rejected"
      tag_scope: "system" | "user" | "group"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      brew_type: ["pour_over", "iced_pour_over"],
      equipment_kind: ["dripper", "filter", "kettle"],
      roast_level: ["light", "medium_light", "medium", "medium_dark", "dark"],
      suggestion_status: ["pending", "approved", "rejected"],
      tag_scope: ["system", "user", "group"],
    },
  },
} as const

