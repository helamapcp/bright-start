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
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          factory_id: string
          id: string
          message: string
          reference_id: string | null
          reference_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          factory_id: string
          id?: string
          message: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          factory_id?: string
          id?: string
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          factory_id: string | null
          id: string
          resource_id: string | null
          resource_type: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          factory_id?: string | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          factory_id?: string | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          confidence: number | null
          created_at: string
          factory_id: string
          forecast_date: string
          id: string
          material_id: string | null
          model_version: string | null
          predicted_kg: number
          tenant_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          factory_id: string
          forecast_date: string
          id?: string
          material_id?: string | null
          model_version?: string | null
          predicted_kg?: number
          tenant_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          factory_id?: string
          forecast_date?: string
          id?: string
          material_id?: string | null
          model_version?: string | null
          predicted_kg?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string
          created_by: string | null
          event_type: string
          factory_id: string | null
          id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string
          created_by?: string | null
          event_type: string
          factory_id?: string | null
          id?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          factory_id?: string | null
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
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
          created_at: string
          factory_name: string
          id: string
          location: string | null
          status: string
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_name: string
          id?: string
          location?: string | null
          status?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_name?: string
          id?: string
          location?: string | null
          status?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
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
          availability: number
          factory_id: string
          id: string
          machine_id: string
          measured_at: string
          oee: number
          performance: number
          production_run_id: string | null
          quality: number
          tenant_id: string
        }
        Insert: {
          availability?: number
          factory_id: string
          id?: string
          machine_id: string
          measured_at?: string
          oee?: number
          performance?: number
          production_run_id?: string | null
          quality?: number
          tenant_id: string
        }
        Update: {
          availability?: number
          factory_id?: string
          id?: string
          machine_id?: string
          measured_at?: string
          oee?: number
          performance?: number
          production_run_id?: string | null
          quality?: number
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
          code: string
          created_at: string
          factory_id: string
          id: string
          machine_type: string
          metadata: Json
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          factory_id: string
          id?: string
          machine_type: string
          metadata?: Json
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          factory_id?: string
          id?: string
          machine_type?: string
          metadata?: Json
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
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
          batch_code: string
          created_at: string
          expires_at: string | null
          factory_id: string
          id: string
          material_id: string
          metadata: Json
          received_at: string
          received_kg: number
          remaining_kg: number
          supplier: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          expires_at?: string | null
          factory_id: string
          id?: string
          material_id: string
          metadata?: Json
          received_at?: string
          received_kg?: number
          remaining_kg?: number
          supplier?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          expires_at?: string | null
          factory_id?: string
          id?: string
          material_id?: string
          metadata?: Json
          received_at?: string
          received_kg?: number
          remaining_kg?: number
          supplier?: string | null
          tenant_id?: string
          updated_at?: string
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
          bag_id: string | null
          batch_id: string | null
          consumed_at: string
          consumed_kg: number
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          material_id: string
          production_run_id: string
          tenant_id: string
        }
        Insert: {
          bag_id?: string | null
          batch_id?: string | null
          consumed_at?: string
          consumed_kg: number
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          material_id: string
          production_run_id: string
          tenant_id: string
        }
        Update: {
          bag_id?: string | null
          batch_id?: string | null
          consumed_at?: string
          consumed_kg?: number
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          material_id?: string
          production_run_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_consumption_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "production_bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
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
          name: string
          sack_weight_kg: number | null
          tenant_id: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          is_active?: boolean
          material_code: string
          name: string
          sack_weight_kg?: number | null
          tenant_id: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          is_active?: boolean
          material_code?: string
          name?: string
          sack_weight_kg?: number | null
          tenant_id?: string
          unit_type?: string
          updated_at?: string
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
      mixers: {
        Row: {
          capacity_kg: number
          created_at: string
          cycle_time_minutes: number
          factory_id: string
          id: string
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity_kg?: number
          created_at?: string
          cycle_time_minutes?: number
          factory_id: string
          id?: string
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity_kg?: number
          created_at?: string
          cycle_time_minutes?: number
          factory_id?: string
          id?: string
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mixers_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mixers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_bags: {
        Row: {
          bag_code: string
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          location_id: string | null
          material_id: string | null
          production_run_id: string
          remaining_kg: number
          status: string
          tenant_id: string
          weight_kg: number
        }
        Insert: {
          bag_code: string
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          location_id?: string | null
          material_id?: string | null
          production_run_id: string
          remaining_kg?: number
          status?: string
          tenant_id: string
          weight_kg?: number
        }
        Update: {
          bag_code?: string
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          location_id?: string | null
          material_id?: string | null
          production_run_id?: string
          remaining_kg?: number
          status?: string
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
          machine_id: string | null
          order_number: string
          planned_end_at: string | null
          planned_output_kg: number
          planned_start_at: string | null
          product_name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          machine_id?: string | null
          order_number: string
          planned_end_at?: string | null
          planned_output_kg?: number
          planned_start_at?: string | null
          product_name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          machine_id?: string | null
          order_number?: string
          planned_end_at?: string | null
          planned_output_kg?: number
          planned_start_at?: string | null
          product_name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
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
            foreignKeyName: "production_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
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
      production_plans: {
        Row: {
          constraints: Json
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          outputs: Json
          plan_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          constraints?: Json
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          outputs?: Json
          plan_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          constraints?: Json
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          outputs?: Json
          plan_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_tenant_id_fkey"
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
          machine_id: string | null
          planned_output_kg: number
          production_order_id: string
          scrap_kg: number
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_output_kg?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          factory_id: string
          id?: string
          machine_id?: string | null
          planned_output_kg?: number
          production_order_id: string
          scrap_kg?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_output_kg?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          factory_id?: string
          id?: string
          machine_id?: string | null
          planned_output_kg?: number
          production_order_id?: string
          scrap_kg?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
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
          consumed_material_kg: number
          created_at: string
          factory_id: string
          id: string
          produced_output_kg: number
          production_run_id: string
          tenant_id: string
          yield_ratio: number
        }
        Insert: {
          consumed_material_kg?: number
          created_at?: string
          factory_id: string
          id?: string
          produced_output_kg?: number
          production_run_id: string
          tenant_id: string
          yield_ratio?: number
        }
        Update: {
          consumed_material_kg?: number
          created_at?: string
          factory_id?: string
          id?: string
          produced_output_kg?: number
          production_run_id?: string
          tenant_id?: string
          yield_ratio?: number
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
          default_factory_id: string | null
          email: string
          full_name: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_factory_id?: string | null
          email: string
          full_name: string
          id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_factory_id?: string | null
          email?: string
          full_name?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_factory_id_fkey"
            columns: ["default_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_machine_metrics: {
        Row: {
          availability: number
          factory_id: string
          id: string
          machine_id: string
          oee: number
          performance: number
          quality: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          availability?: number
          factory_id: string
          id?: string
          machine_id: string
          oee?: number
          performance?: number
          quality?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          availability?: number
          factory_id?: string
          id?: string
          machine_id?: string
          oee?: number
          performance?: number
          quality?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projection_production_summary: {
        Row: {
          factory_id: string
          id: string
          output_kg: number
          production_run_id: string
          scrap_kg: number
          tenant_id: string
          updated_at: string
          yield_ratio: number
        }
        Insert: {
          factory_id: string
          id?: string
          output_kg?: number
          production_run_id: string
          scrap_kg?: number
          tenant_id: string
          updated_at?: string
          yield_ratio?: number
        }
        Update: {
          factory_id?: string
          id?: string
          output_kg?: number
          production_run_id?: string
          scrap_kg?: number
          tenant_id?: string
          updated_at?: string
          yield_ratio?: number
        }
        Relationships: []
      }
      projection_stock_balances: {
        Row: {
          factory_id: string
          id: string
          last_event_id: string | null
          location_id: string
          material_id: string
          quantity_kg: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          factory_id: string
          id?: string
          last_event_id?: string | null
          location_id: string
          material_id: string
          quantity_kg?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          factory_id?: string
          id?: string
          last_event_id?: string | null
          location_id?: string
          material_id?: string
          quantity_kg?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      separations: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          factory_id: string
          id: string
          notes: string | null
          started_at: string | null
          status: string
          tenant_id: string
          transfer_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          factory_id: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          factory_id?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "separations_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separations_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          location_id: string
          material_id: string
          quantity_kg: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          location_id: string
          material_id: string
          quantity_kg?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          location_id?: string
          material_id?: string
          quantity_kg?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
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
            foreignKeyName: "stock_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
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
          code: string
          created_at: string
          factory_id: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          factory_id: string
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          factory_id?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          tenant_id?: string
          updated_at?: string
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
          created_at: string
          created_by: string | null
          factory_id: string
          from_location_id: string | null
          id: string
          material_id: string
          movement_type: string
          notes: string | null
          quantity_kg: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          to_location_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          factory_id: string
          from_location_id?: string | null
          id?: string
          material_id: string
          movement_type: string
          notes?: string | null
          quantity_kg: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          to_location_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          factory_id?: string
          from_location_id?: string | null
          id?: string
          material_id?: string
          movement_type?: string
          notes?: string | null
          quantity_kg?: number
          reference_id?: string | null
          reference_type?: string | null
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
          created_at: string
          id: string
          status: string
          tenant_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tenant_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tenant_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transfer_items: {
        Row: {
          batch_id: string | null
          created_at: string
          factory_id: string
          id: string
          material_id: string
          moved_kg: number
          requested_kg: number
          status: string
          tenant_id: string
          transfer_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          factory_id: string
          id?: string
          material_id: string
          moved_kg?: number
          requested_kg?: number
          status?: string
          tenant_id: string
          transfer_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          factory_id?: string
          id?: string
          material_id?: string
          moved_kg?: number
          requested_kg?: number
          status?: string
          tenant_id?: string
          transfer_id?: string
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
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          factory_id: string
          from_location_id: string
          id: string
          notes: string | null
          requested_at: string
          requested_by: string | null
          status: string
          tenant_id: string
          to_location_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          factory_id: string
          from_location_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id: string
          to_location_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          factory_id?: string
          from_location_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          to_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          factory_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factory_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          factory_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
