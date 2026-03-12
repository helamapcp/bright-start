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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      formulation_items: {
        Row: {
          created_at: string | null
          formulation_id: string
          id: string
          product_id: string
          quantity_per_batch: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          formulation_id: string
          id?: string
          product_id: string
          quantity_per_batch?: number
          unit?: string
        }
        Update: {
          created_at?: string | null
          formulation_id?: string
          id?: string
          product_id?: string
          quantity_per_batch?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulation_items_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      formulations: {
        Row: {
          active: boolean
          created_at: string | null
          final_product: string
          id: string
          machine: string | null
          name: string
          parent_formulation_id: string | null
          updated_at: string | null
          weight_per_batch: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          final_product: string
          id?: string
          machine?: string | null
          name: string
          parent_formulation_id?: string | null
          updated_at?: string | null
          weight_per_batch?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          final_product?: string
          id?: string
          machine?: string | null
          name?: string
          parent_formulation_id?: string | null
          updated_at?: string | null
          weight_per_batch?: number
        }
        Relationships: [
          {
            foreignKeyName: "formulations_parent_formulation_id_fkey"
            columns: ["parent_formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_items: {
        Row: {
          counted_quantity: number
          counted_total_kg: number
          created_at: string | null
          difference_kg: number
          id: string
          inventory_count_id: string
          justification: string | null
          product_id: string
          system_quantity: number
          system_total_kg: number
        }
        Insert: {
          counted_quantity?: number
          counted_total_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          inventory_count_id: string
          justification?: string | null
          product_id: string
          system_quantity?: number
          system_total_kg?: number
        }
        Update: {
          counted_quantity?: number
          counted_total_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          inventory_count_id?: string
          justification?: string | null
          product_id?: string
          system_quantity?: number
          system_total_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_inventory_count_id_fkey"
            columns: ["inventory_count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          location_code: string
          notes: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          location_code: string
          notes?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          location_code?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          action_type: string
          created_at: string | null
          from_sector: string | null
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          to_sector: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          from_sector?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          to_sector?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          from_sector?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          to_sector?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          code: string
          created_at: string | null
          description: string | null
          id: string
          location_type: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      material_excess: {
        Row: {
          consumed: boolean
          consumed_by_schedule_id: string | null
          created_at: string | null
          excess_kg: number
          id: string
          location_code: string
          product_id: string
          production_date: string
          source_schedule_id: string | null
        }
        Insert: {
          consumed?: boolean
          consumed_by_schedule_id?: string | null
          created_at?: string | null
          excess_kg?: number
          id?: string
          location_code: string
          product_id: string
          production_date: string
          source_schedule_id?: string | null
        }
        Update: {
          consumed?: boolean
          consumed_by_schedule_id?: string | null
          created_at?: string | null
          excess_kg?: number
          id?: string
          location_code?: string
          product_id?: string
          production_date?: string
          source_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_excess_consumed_by_schedule_id_fkey"
            columns: ["consumed_by_schedule_id"]
            isOneToOne: false
            referencedRelation: "production_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_excess_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "material_excess_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_excess_source_schedule_id_fkey"
            columns: ["source_schedule_id"]
            isOneToOne: false
            referencedRelation: "production_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      mixers: {
        Row: {
          active: boolean
          capacity_kg: number
          created_at: string | null
          cycle_time_minutes: number
          id: string
          max_batches_per_day: number
          name: string
          production_line: string | null
        }
        Insert: {
          active?: boolean
          capacity_kg?: number
          created_at?: string | null
          cycle_time_minutes?: number
          id?: string
          max_batches_per_day?: number
          name: string
          production_line?: string | null
        }
        Update: {
          active?: boolean
          capacity_kg?: number
          created_at?: string | null
          cycle_time_minutes?: number
          id?: string
          max_batches_per_day?: number
          name?: string
          production_line?: string | null
        }
        Relationships: []
      }
      production_bags: {
        Row: {
          bag_number: number
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          formulation_id: string
          id: string
          location_code: string
          production_order_id: string | null
          production_planning_id: string | null
          status: string
          transfer_id: string | null
          transferred_to: string | null
          weight_kg: number
        }
        Insert: {
          bag_number?: number
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          formulation_id: string
          id?: string
          location_code?: string
          production_order_id?: string | null
          production_planning_id?: string | null
          status?: string
          transfer_id?: string | null
          transferred_to?: string | null
          weight_kg?: number
        }
        Update: {
          bag_number?: number
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          formulation_id?: string
          id?: string
          location_code?: string
          production_order_id?: string | null
          production_planning_id?: string | null
          status?: string
          transfer_id?: string | null
          transferred_to?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_bags_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "production_bags_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_production_planning_id_fkey"
            columns: ["production_planning_id"]
            isOneToOne: false
            referencedRelation: "production_planning"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_code: string | null
          batch_count: number
          batches: number | null
          completed_at: string | null
          created_at: string | null
          final_product: string | null
          formulation_id: string
          id: string
          machine: string | null
          notes: string | null
          produced_by: string | null
          produced_by_name: string | null
          production_order_id: string | null
          status: string
          total_compound_kg: number
        }
        Insert: {
          batch_code?: string | null
          batch_count?: number
          batches?: number | null
          completed_at?: string | null
          created_at?: string | null
          final_product?: string | null
          formulation_id: string
          id?: string
          machine?: string | null
          notes?: string | null
          produced_by?: string | null
          produced_by_name?: string | null
          production_order_id?: string | null
          status?: string
          total_compound_kg?: number
        }
        Update: {
          batch_code?: string | null
          batch_count?: number
          batches?: number | null
          completed_at?: string | null
          created_at?: string | null
          final_product?: string | null
          formulation_id?: string
          id?: string
          machine?: string | null
          notes?: string | null
          produced_by?: string | null
          produced_by_name?: string | null
          production_order_id?: string | null
          status?: string
          total_compound_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          adjusted_quantity_kg: number
          created_at: string | null
          difference_kg: number
          id: string
          ideal_quantity_kg: number
          justification: string | null
          package_type: string
          package_weight: number
          product_id: string
          production_order_id: string
        }
        Insert: {
          adjusted_quantity_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          ideal_quantity_kg?: number
          justification?: string | null
          package_type?: string
          package_weight?: number
          product_id: string
          production_order_id: string
        }
        Update: {
          adjusted_quantity_kg?: number
          created_at?: string | null
          difference_kg?: number
          id?: string
          ideal_quantity_kg?: number
          justification?: string | null
          package_type?: string
          package_weight?: number
          product_id?: string
          production_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          batches: number
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          final_product: string
          formulation_id: string
          id: string
          machine: string | null
          notes: string | null
          status: string
          total_compound_kg: number
          weight_per_batch: number
        }
        Insert: {
          batches?: number
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          final_product: string
          formulation_id: string
          id?: string
          machine?: string | null
          notes?: string | null
          status?: string
          total_compound_kg?: number
          weight_per_batch?: number
        }
        Update: {
          batches?: number
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          final_product?: string
          formulation_id?: string
          id?: string
          machine?: string | null
          notes?: string | null
          status?: string
          total_compound_kg?: number
          weight_per_batch?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_planning: {
        Row: {
          batches: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          executed_at: string | null
          executed_by: string | null
          executed_by_name: string | null
          formulation_id: string
          id: string
          mixer_id: string
          notes: string | null
          production_date: string
          production_order_id: string | null
          status: string
          total_weight_kg: number
          updated_at: string | null
        }
        Insert: {
          batches?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          executed_at?: string | null
          executed_by?: string | null
          executed_by_name?: string | null
          formulation_id: string
          id?: string
          mixer_id: string
          notes?: string | null
          production_date: string
          production_order_id?: string | null
          status?: string
          total_weight_kg?: number
          updated_at?: string | null
        }
        Update: {
          batches?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          executed_at?: string | null
          executed_by?: string | null
          executed_by_name?: string | null
          formulation_id?: string
          id?: string
          mixer_id?: string
          notes?: string | null
          production_date?: string
          production_order_id?: string | null
          status?: string
          total_weight_kg?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_planning_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_planning_mixer_id_fkey"
            columns: ["mixer_id"]
            isOneToOne: false
            referencedRelation: "mixers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_planning_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_schedules: {
        Row: {
          batches: number
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          formulation_id: string
          id: string
          mixer_id: string
          notes: string | null
          production_date: string
          status: string
          total_weight_kg: number
        }
        Insert: {
          batches?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          formulation_id: string
          id?: string
          mixer_id: string
          notes?: string | null
          production_date: string
          status?: string
          total_weight_kg?: number
        }
        Update: {
          batches?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          formulation_id?: string
          id?: string
          mixer_id?: string
          notes?: string | null
          production_date?: string
          status?: string
          total_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_schedules_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_schedules_mixer_id_fkey"
            columns: ["mixer_id"]
            isOneToOne: false
            referencedRelation: "mixers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_unit: string
          category_id: string | null
          conversion_factor: number
          created_at: string | null
          id: string
          name: string
          package_type: string
          package_weight: number
          unit_weight_kg: number
        }
        Insert: {
          base_unit?: string
          category_id?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          name: string
          package_type?: string
          package_weight?: number
          unit_weight_kg?: number
        }
        Update: {
          base_unit?: string
          category_id?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          name?: string
          package_type?: string
          package_weight?: number
          unit_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      purchase_suggestions: {
        Row: {
          available_stock_kg: number
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          production_schedule_id: string | null
          required_quantity_kg: number
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          status: string
          suggested_purchase_kg: number
        }
        Insert: {
          available_stock_kg?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          production_schedule_id?: string | null
          required_quantity_kg?: number
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          suggested_purchase_kg?: number
        }
        Update: {
          available_stock_kg?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          production_schedule_id?: string | null
          required_quantity_kg?: number
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          status?: string
          suggested_purchase_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_suggestions_production_schedule_id_fkey"
            columns: ["production_schedule_id"]
            isOneToOne: false
            referencedRelation: "production_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      separations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          from_sector: string
          id: string
          operator: string | null
          product_id: string
          product_name: string
          quantity: number
          status: string
          to_sector: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          from_sector: string
          id?: string
          operator?: string | null
          product_id: string
          product_name: string
          quantity: number
          status?: string
          to_sector: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          from_sector?: string
          id?: string
          operator?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
          status?: string
          to_sector?: string
        }
        Relationships: [
          {
            foreignKeyName: "separations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          id: string
          location_code: string
          product_id: string
          quantity: number
          total_kg: number
          unit: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          location_code: string
          product_id: string
          quantity?: number
          total_kg?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          location_code?: string
          product_id?: string
          quantity?: number
          total_kg?: number
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          created_at: string | null
          difference_kg: number
          id: string
          location_code: string
          new_quantity: number
          new_total_kg: number
          old_quantity: number
          old_total_kg: number
          product_id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          difference_kg?: number
          id?: string
          location_code: string
          new_quantity?: number
          new_total_kg?: number
          old_quantity?: number
          old_total_kg?: number
          product_id: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          difference_kg?: number
          id?: string
          location_code?: string
          new_quantity?: number
          new_total_kg?: number
          old_quantity?: number
          old_total_kg?: number
          product_id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          location_code: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_kg: number
          unit: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          location_code: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          location_code?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_snapshots: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          sector: string
          total_kg: number
          unit: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          sector: string
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          sector?: string
          total_kg?: number
          unit?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          product_id: string
          requested_quantity: number
          requested_unit: string
          sent_quantity: number
          sent_total_kg: number
          sent_unit: string
          status: string
          transfer_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          requested_quantity?: number
          requested_unit?: string
          sent_quantity?: number
          sent_total_kg?: number
          sent_unit?: string
          status?: string
          transfer_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          requested_quantity?: number
          requested_unit?: string
          sent_quantity?: number
          sent_total_kg?: number
          sent_unit?: string
          status?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_name: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string | null
          from_location: string
          id: string
          notes: string | null
          requested_by: string | null
          requested_by_name: string | null
          status: string
          to_location: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          from_location: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
          to_location: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string | null
          from_location?: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_location_fkey"
            columns: ["from_location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_to_location_fkey"
            columns: ["to_location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      inventory_adjustment_summary: {
        Row: {
          avg_difference_kg: number | null
          location_code: string | null
          product_id: string | null
          total_adjustments: number | null
          total_difference_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_stock_adjustment: {
        Args: {
          p_justification: string
          p_location_code: string
          p_new_quantity: number
          p_new_total_kg: number
          p_product_id: string
          p_user_id: string
          p_user_name: string
        }
        Returns: Json
      }
      confirm_inventory_count: {
        Args: {
          p_count_id: string
          p_items?: Json
          p_user_id: string
          p_user_name: string
        }
        Returns: Json
      }
      confirm_production: {
        Args: {
          p_batches: number
          p_final_product: string
          p_formulation_id: string
          p_items?: Json
          p_machine: string
          p_notes?: string
          p_total_compound_kg: number
          p_user_id: string
          p_user_name: string
          p_weight_per_batch: number
        }
        Returns: Json
      }
      confirm_transfer: {
        Args: {
          p_confirmed_items?: Json
          p_transfer_id: string
          p_user_id?: string
          p_user_name?: string
        }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      stock_entry: {
        Args: {
          p_location_code: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_unit: string
          p_user_id: string
          p_user_name: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "operador"
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
      app_role: ["admin", "gerente", "operador"],
    },
  },
} as const
