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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      code_sequences: {
        Row: {
          entity_key: string
          last_value: number
          updated_at: string
        }
        Insert: {
          entity_key: string
          last_value?: number
          updated_at?: string
        }
        Update: {
          entity_key?: string
          last_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string | null
          created_at: string | null
          created_by: string | null
          event_type: string
          factory_id: string
          id: string
          payload: Json | null
          tenant_id: string
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string | null
          created_by?: string | null
          event_type: string
          factory_id: string
          id?: string
          payload?: Json | null
          tenant_id: string
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          factory_id?: string
          id?: string
          payload?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          created_at: string | null
          factory_name: string
          id: string
          location: string | null
          tenant_id: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          factory_name: string
          id: string
          location?: string | null
          tenant_id: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          factory_name?: string
          id?: string
          location?: string | null
          tenant_id?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_oee_metrics: {
        Row: {
          availability_pct: number
          calculated_at: string
          calculated_by: string | null
          factory_id: string
          id: string
          machine_id: string
          oee_pct: number
          performance_pct: number
          production_run_id: string
          quality_pct: number
          tenant_id: string
        }
        Insert: {
          availability_pct: number
          calculated_at?: string
          calculated_by?: string | null
          factory_id: string
          id?: string
          machine_id: string
          oee_pct: number
          performance_pct: number
          production_run_id: string
          quality_pct: number
          tenant_id: string
        }
        Update: {
          availability_pct?: number
          calculated_at?: string
          calculated_by?: string | null
          factory_id?: string
          id?: string
          machine_id?: string
          oee_pct?: number
          performance_pct?: number
          production_run_id?: string
          quality_pct?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_oee_metrics_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_oee_metrics_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_oee_metrics_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_oee_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          is_active: boolean
          machine_code: string
          machine_name: string
          nominal_capacity_kg_h: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          is_active?: boolean
          machine_code: string
          machine_name: string
          nominal_capacity_kg_h?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          is_active?: boolean
          machine_code?: string
          machine_name?: string
          nominal_capacity_kg_h?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_batches: {
        Row: {
          available_kg: number
          batch_code: string
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          material_id: string
          metadata: Json
          received_at: string
          received_kg: number
          supplier: string | null
          tenant_id: string
        }
        Insert: {
          available_kg?: number
          batch_code: string
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          material_id: string
          metadata?: Json
          received_at?: string
          received_kg?: number
          supplier?: string | null
          tenant_id: string
        }
        Update: {
          available_kg?: number
          batch_code?: string
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          material_id?: string
          metadata?: Json
          received_at?: string
          received_kg?: number
          supplier?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_batches_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_batches_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_consumption: {
        Row: {
          batch_id: string | null
          consumed_at: string
          consumed_kg: number
          consumption_location_id: string | null
          created_by: string | null
          factory_id: string
          id: string
          material_id: string
          production_run_id: string
          tenant_id: string
        }
        Insert: {
          batch_id?: string | null
          consumed_at?: string
          consumed_kg: number
          consumption_location_id?: string | null
          created_by?: string | null
          factory_id: string
          id?: string
          material_id: string
          production_run_id: string
          tenant_id: string
        }
        Update: {
          batch_id?: string | null
          consumed_at?: string
          consumed_kg?: number
          consumption_location_id?: string | null
          created_by?: string | null
          factory_id?: string
          id?: string
          material_id?: string
          production_run_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_consumption_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_consumption_location_id_fkey"
            columns: ["consumption_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          is_active: boolean
          material_code: string
          material_name: string
          tenant_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          is_active?: boolean
          material_code: string
          material_name: string
          tenant_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          is_active?: boolean
          material_code?: string
          material_name?: string
          tenant_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_bags: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          location_id: string
          material_id: string
          production_run_id: string
          tenant_id: string
          weight_kg: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          location_id: string
          material_id: string
          production_run_id: string
          tenant_id: string
          weight_kg: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          location_id?: string
          material_id?: string
          production_run_id?: string
          tenant_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_bags_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          order_code: string
          planned_end_at: string | null
          planned_output_kg: number
          planned_start_at: string | null
          product_name: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          order_code: string
          planned_end_at?: string | null
          planned_output_kg?: number
          planned_start_at?: string | null
          product_name: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          order_code?: string
          planned_end_at?: string | null
          planned_output_kg?: number
          planned_start_at?: string | null
          product_name?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_runs: {
        Row: {
          actual_output_kg: number
          created_at: string
          created_by: string | null
          ended_at: string | null
          factory_id: string
          id: string
          machine_id: string
          planned_output_kg: number
          production_order_id: string
          scrap_kg: number
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          actual_output_kg?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          factory_id: string
          id?: string
          machine_id: string
          planned_output_kg?: number
          production_order_id: string
          scrap_kg?: number
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          actual_output_kg?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          factory_id?: string
          id?: string
          machine_id?: string
          planned_output_kg?: number
          production_order_id?: string
          scrap_kg?: number
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_yield_metrics: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          factory_id: string
          id: string
          production_run_id: string
          tenant_id: string
          yield_pct: number
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          factory_id: string
          id?: string
          production_run_id: string
          tenant_id: string
          yield_pct: number
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          factory_id?: string
          id?: string
          production_run_id?: string
          tenant_id?: string
          yield_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_yield_metrics_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_yield_metrics_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_yield_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_machine_metrics: {
        Row: {
          availability_pct: number | null
          factory_id: string
          id: string
          last_calculated_at: string | null
          machine_id: string
          oee_pct: number | null
          performance_pct: number | null
          quality_pct: number | null
          tenant_id: string
        }
        Insert: {
          availability_pct?: number | null
          factory_id: string
          id?: string
          last_calculated_at?: string | null
          machine_id: string
          oee_pct?: number | null
          performance_pct?: number | null
          quality_pct?: number | null
          tenant_id: string
        }
        Update: {
          availability_pct?: number | null
          factory_id?: string
          id?: string
          last_calculated_at?: string | null
          machine_id?: string
          oee_pct?: number | null
          performance_pct?: number | null
          quality_pct?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_machine_metrics_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_machine_metrics_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_machine_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_production_summary: {
        Row: {
          actual_output_kg: number
          factory_id: string
          id: string
          machine_id: string
          planned_output_kg: number
          production_run_id: string
          scrap_kg: number
          tenant_id: string
          updated_at: string
          yield_pct: number | null
        }
        Insert: {
          actual_output_kg?: number
          factory_id: string
          id?: string
          machine_id: string
          planned_output_kg?: number
          production_run_id: string
          scrap_kg?: number
          tenant_id: string
          updated_at?: string
          yield_pct?: number | null
        }
        Update: {
          actual_output_kg?: number
          factory_id?: string
          id?: string
          machine_id?: string
          planned_output_kg?: number
          production_run_id?: string
          scrap_kg?: number
          tenant_id?: string
          updated_at?: string
          yield_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projection_production_summary_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_production_summary_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_production_summary_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_production_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_stock_balances: {
        Row: {
          factory_id: string
          id: string
          location_id: string
          material_id: string
          quantity_kg: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          factory_id: string
          id?: string
          location_id: string
          material_id: string
          quantity_kg?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          factory_id?: string
          id?: string
          location_id?: string
          material_id?: string
          quantity_kg?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_stock_balances_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_stock_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_stock_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
          permissions: Json | null
        }
        Insert: {
          id: string
          name: string
          permissions?: Json | null
        }
        Update: {
          id?: string
          name?: string
          permissions?: Json | null
        }
        Relationships: []
      }
      separation_orders: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          notes: string | null
          status: string
          tenant_id: string
          transfer_request_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          transfer_request_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          transfer_request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "separation_orders_transfer_request_id_fkey"
            columns: ["transfer_request_id"]
            isOneToOne: false
            referencedRelation: "transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          batch_id: string | null
          factory_id: string
          id: string
          location_id: string
          material_id: string
          quantity_kg: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          factory_id: string
          id?: string
          location_id: string
          material_id: string
          quantity_kg?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          factory_id?: string
          id?: string
          location_id?: string
          material_id?: string
          quantity_kg?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          code: string | null
          factory_id: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          code?: string | null
          factory_id: string
          id: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          code?: string | null
          factory_id?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_by: string | null
          factory_id: string
          from_location_id: string | null
          id: string
          material_id: string
          metadata: Json
          movement_type: string
          occurred_at: string
          quantity_kg: number
          related_production_run_id: string | null
          related_transfer_id: string | null
          tenant_id: string
          to_location_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_by?: string | null
          factory_id: string
          from_location_id?: string | null
          id?: string
          material_id: string
          metadata?: Json
          movement_type: string
          occurred_at?: string
          quantity_kg: number
          related_production_run_id?: string | null
          related_transfer_id?: string | null
          tenant_id: string
          to_location_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_by?: string | null
          factory_id?: string
          from_location_id?: string | null
          id?: string
          material_id?: string
          metadata?: Json
          movement_type?: string
          occurred_at?: string
          quantity_kg?: number
          related_production_run_id?: string | null
          related_transfer_id?: string | null
          tenant_id?: string
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          tenant_name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          status?: string | null
          tenant_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          tenant_name?: string
        }
        Relationships: []
      }
      transfer_items: {
        Row: {
          approved_kg: number | null
          batch_id: string | null
          created_at: string
          factory_id: string
          id: string
          material_id: string
          requested_kg: number
          tenant_id: string
          transfer_request_id: string
          transferred_kg: number | null
        }
        Insert: {
          approved_kg?: number | null
          batch_id?: string | null
          created_at?: string
          factory_id: string
          id?: string
          material_id: string
          requested_kg: number
          tenant_id: string
          transfer_request_id: string
          transferred_kg?: number | null
        }
        Update: {
          approved_kg?: number | null
          batch_id?: string | null
          created_at?: string
          factory_id?: string
          id?: string
          material_id?: string
          requested_kg?: number
          tenant_id?: string
          transfer_request_id?: string
          transferred_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_request_id_fkey"
            columns: ["transfer_request_id"]
            isOneToOne: false
            referencedRelation: "transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          factory_id: string
          from_location_id: string
          id: string
          notes: string | null
          requested_at: string
          requested_by: string | null
          status: string
          tenant_id: string
          to_location_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          factory_id: string
          from_location_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id: string
          to_location_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          factory_id?: string
          from_location_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          to_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_factories: {
        Row: {
          created_at: string | null
          factory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          factory_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          factory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_factories_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_factories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenants: {
        Row: {
          created_at: string | null
          role_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          code: string
          created_at: string | null
          email: string
          factory_id: string | null
          id: string
          name: string | null
          role_id: string | null
          tenant_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          factory_id?: string | null
          id: string
          name?: string | null
          role_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          factory_id?: string | null
          id?: string
          name?: string | null
          role_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_factory: { Args: { _factory_id: string }; Returns: boolean }
      current_tenant_id: { Args: never; Returns: string }
      ensure_stock_location: {
        Args: {
          p_factory_id: string
          p_location_code: string
          p_tenant_id: string
        }
        Returns: string
      }
      fn_calculate_oee: {
        Args: {
          p_created_by?: string
          p_factory_id: string
          p_production_run_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_calculate_yield: {
        Args: {
          p_created_by?: string
          p_factory_id: string
          p_production_run_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_consume_material: {
        Args: {
          p_batch_id?: string
          p_consumed_at?: string
          p_consumed_kg: number
          p_consumption_location_code?: string
          p_created_by?: string
          p_factory_id: string
          p_material_id: string
          p_production_run_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_create_material_reception: {
        Args: {
          p_batch_code: string
          p_created_by?: string
          p_factory_id: string
          p_location_code?: string
          p_material_id: string
          p_metadata?: Json
          p_received_at?: string
          p_received_kg: number
          p_supplier?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_create_transfer_request: {
        Args: {
          p_factory_id: string
          p_from_location_code: string
          p_items: Json
          p_notes?: string
          p_requested_by?: string
          p_tenant_id: string
          p_to_location_code: string
        }
        Returns: Json
      }
      fn_register_produced_bag: {
        Args: {
          p_created_by?: string
          p_factory_id: string
          p_location_code?: string
          p_material_id: string
          p_production_run_id: string
          p_tenant_id: string
          p_weight_kg: number
        }
        Returns: Json
      }
      fn_start_production_run: {
        Args: {
          p_consumption_location_code?: string
          p_created_by?: string
          p_factory_id: string
          p_machine_id: string
          p_material_allocations: Json
          p_production_order_id: string
          p_started_at?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_standard_code: {
        Args: { p_entity: string; p_pad: number; p_prefix: string }
        Returns: string
      }
      refresh_projection_stock: {
        Args: {
          p_factory_id: string
          p_location_id: string
          p_material_id: string
          p_tenant_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "operador" | "estoque"
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
      app_role: ["admin", "gerente", "operador", "estoque"],
    },
  },
} as const
