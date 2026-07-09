// 依 supabase gen types typescript 格式手寫（W1 時本機 stack 未啟動）。
// 本機 Supabase 啟動後請以 `pnpm db:types` 重新產生覆蓋本檔。
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      beans: {
        Row: {
          agtron: number | null
          altitude: string | null
          created_at: string
          farm: string | null
          id: string
          name_batch: string
          notes: string | null
          origin: string
          process: string | null
          roast_date: string
          roast_level: Database['public']['Enums']['roast_level']
          roaster: string
          updated_at: string
          user_id: string
          varietal: string | null
        }
        Insert: {
          agtron?: number | null
          altitude?: string | null
          created_at?: string
          farm?: string | null
          id?: string
          name_batch: string
          notes?: string | null
          origin: string
          process?: string | null
          roast_date: string
          roast_level: Database['public']['Enums']['roast_level']
          roaster: string
          updated_at?: string
          user_id: string
          varietal?: string | null
        }
        Update: {
          agtron?: number | null
          altitude?: string | null
          created_at?: string
          farm?: string | null
          id?: string
          name_batch?: string
          notes?: string | null
          origin?: string
          process?: string | null
          roast_date?: string
          roast_level?: Database['public']['Enums']['roast_level']
          roaster?: string
          updated_at?: string
          user_id?: string
          varietal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'beans_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
            foreignKeyName: 'brew_flavor_tags_brew_id_fkey'
            columns: ['brew_id']
            isOneToOne: false
            referencedRelation: 'brews'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brew_flavor_tags_brew_id_fkey'
            columns: ['brew_id']
            isOneToOne: false
            referencedRelation: 'brew_details'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brew_flavor_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'flavor_tags'
            referencedColumns: ['id']
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
          brew_type: Database['public']['Enums']['brew_type']
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
          pour_notes: string | null
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
          brew_type?: Database['public']['Enums']['brew_type']
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
          pour_notes?: string | null
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
          brew_type?: Database['public']['Enums']['brew_type']
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
          pour_notes?: string | null
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
            foreignKeyName: 'brews_bean_id_fkey'
            columns: ['bean_id']
            isOneToOne: false
            referencedRelation: 'beans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brews_grinder_id_fkey'
            columns: ['grinder_id']
            isOneToOne: false
            referencedRelation: 'grinders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      flavor_tags: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          scope: Database['public']['Enums']['tag_scope']
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          scope?: Database['public']['Enums']['tag_scope']
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          scope?: Database['public']['Enums']['tag_scope']
        }
        Relationships: [
          {
            foreignKeyName: 'flavor_tags_owner_user_id_fkey'
            columns: ['owner_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      grinders: {
        Row: {
          burr_type: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          burr_type?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          burr_type?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'grinders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
      tag_suggestions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          status: Database['public']['Enums']['suggestion_status']
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          status?: Database['public']['Enums']['suggestion_status']
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: Database['public']['Enums']['suggestion_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tag_suggestions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
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
          brew_type: Database['public']['Enums']['brew_type'] | null
          brewed_at: string | null
          created_at: string | null
          dose_g: number | null
          dripper: string | null
          filter: string | null
          flavor_notes: string | null
          grind_setting: string | null
          grinder_id: string | null
          ice_g: number | null
          id: string | null
          kettle: string | null
          name_batch: string | null
          next_adjustment: string | null
          notes: string | null
          origin: string | null
          overall: number | null
          pour_notes: string | null
          process: string | null
          ratio_include_ice: boolean | null
          ratio_value: number | null
          rest_days: number | null
          roast_date: string | null
          roast_level: Database['public']['Enums']['roast_level'] | null
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
            foreignKeyName: 'brews_bean_id_fkey'
            columns: ['bean_id']
            isOneToOne: false
            referencedRelation: 'beans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brews_grinder_id_fkey'
            columns: ['grinder_id']
            isOneToOne: false
            referencedRelation: 'grinders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      brew_type: 'pour_over' | 'iced_pour_over'
      roast_level: 'light' | 'medium_light' | 'medium' | 'medium_dark' | 'dark'
      suggestion_status: 'pending' | 'approved' | 'rejected'
      tag_scope: 'system' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof DatabaseWithoutInternals,
  'public'
>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      brew_type: ['pour_over', 'iced_pour_over'],
      roast_level: ['light', 'medium_light', 'medium', 'medium_dark', 'dark'],
      suggestion_status: ['pending', 'approved', 'rejected'],
      tag_scope: ['system', 'user'],
    },
  },
} as const
