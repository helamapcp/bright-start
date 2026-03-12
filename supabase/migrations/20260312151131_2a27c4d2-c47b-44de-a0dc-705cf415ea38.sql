-- PHASE 3-5 FOUNDATION (fresh schema rebuild)
-- WARNING: destructive reset of PUBLIC schema objects in TEST environment.

DO $$
DECLARE r record;
BEGIN
  -- Drop views
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.viewname);
  END LOOP;

  -- Drop tables
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;

  -- Drop functions (public schema only)
  FOR r IN (
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  ) LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
  END LOOP;

  -- Drop enum if exists
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'app_role') THEN
    EXECUTE 'DROP TYPE public.app_role CASCADE';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'operador');

-- ---------- Core SaaS ----------
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_name TEXT NOT NULL,
  location TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_name)
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  default_factory_id UUID REFERENCES public.factories(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, factory_id, role)
);

-- ---------- Master Data ----------
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, code)
);

CREATE TABLE public.mixers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity_kg NUMERIC NOT NULL DEFAULT 0,
  cycle_time_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, name)
);

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'kg',
  sack_weight_kg NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, material_code)
);

CREATE TABLE public.material_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_code TEXT NOT NULL,
  supplier TEXT,
  received_kg NUMERIC NOT NULL DEFAULT 0,
  remaining_kg NUMERIC NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, batch_code)
);

CREATE TABLE public.stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'warehouse',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, code)
);

-- ---------- Operations ----------
CREATE TABLE public.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, material_id, location_id)
);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.material_batches(id) ON DELETE SET NULL,
  from_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity_kg NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  to_location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.material_batches(id) ON DELETE SET NULL,
  requested_kg NUMERIC NOT NULL DEFAULT 0,
  moved_kg NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  transfer_id UUID REFERENCES public.transfers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  planned_output_kg NUMERIC NOT NULL DEFAULT 0,
  product_name TEXT NOT NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, order_number)
);

CREATE TABLE public.production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'created',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  planned_output_kg NUMERIC NOT NULL DEFAULT 0,
  actual_output_kg NUMERIC NOT NULL DEFAULT 0,
  scrap_kg NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  bag_code TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  remaining_kg NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'stored',
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, bag_code)
);

CREATE TABLE public.material_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.material_batches(id) ON DELETE SET NULL,
  bag_id UUID REFERENCES public.production_bags(id) ON DELETE SET NULL,
  consumed_kg NUMERIC NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Events + Projections ----------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projection_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  factory_id UUID NOT NULL,
  material_id UUID NOT NULL,
  location_id UUID NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  last_event_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, material_id, location_id)
);

CREATE TABLE public.projection_production_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  factory_id UUID NOT NULL,
  production_run_id UUID NOT NULL,
  output_kg NUMERIC NOT NULL DEFAULT 0,
  scrap_kg NUMERIC NOT NULL DEFAULT 0,
  yield_ratio NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, production_run_id)
);

CREATE TABLE public.projection_machine_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  factory_id UUID NOT NULL,
  machine_id UUID NOT NULL,
  oee NUMERIC NOT NULL DEFAULT 0,
  availability NUMERIC NOT NULL DEFAULT 0,
  performance NUMERIC NOT NULL DEFAULT 0,
  quality NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, machine_id)
);

CREATE TABLE public.production_yield_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id UUID NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  produced_output_kg NUMERIC NOT NULL DEFAULT 0,
  consumed_material_kg NUMERIC NOT NULL DEFAULT 0,
  yield_ratio NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, production_run_id)
);

CREATE TABLE public.machine_oee_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  production_run_id UUID REFERENCES public.production_runs(id) ON DELETE SET NULL,
  availability NUMERIC NOT NULL DEFAULT 0,
  performance NUMERIC NOT NULL DEFAULT 0,
  quality NUMERIC NOT NULL DEFAULT 0,
  oee NUMERIC NOT NULL DEFAULT 0,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE SET NULL,
  actor_user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  forecast_date DATE NOT NULL,
  predicted_kg NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, material_id, forecast_date)
);

CREATE TABLE public.production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (factory_id, plan_date)
);

-- ---------- Indexes ----------
CREATE INDEX idx_factories_tenant ON public.factories(tenant_id);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX idx_user_roles_factory ON public.user_roles(factory_id);
CREATE INDEX idx_machines_tenant_factory ON public.machines(tenant_id, factory_id);
CREATE INDEX idx_mixers_tenant_factory ON public.mixers(tenant_id, factory_id);
CREATE INDEX idx_materials_tenant_factory ON public.materials(tenant_id, factory_id);
CREATE INDEX idx_batches_tenant_factory ON public.material_batches(tenant_id, factory_id);
CREATE INDEX idx_stock_locations_tenant_factory ON public.stock_locations(tenant_id, factory_id);
CREATE INDEX idx_stock_balances_tenant_factory ON public.stock_balances(tenant_id, factory_id);
CREATE INDEX idx_stock_movements_tenant_factory ON public.stock_movements(tenant_id, factory_id);
CREATE INDEX idx_production_orders_tenant_factory ON public.production_orders(tenant_id, factory_id);
CREATE INDEX idx_production_runs_tenant_factory ON public.production_runs(tenant_id, factory_id);
CREATE INDEX idx_production_bags_tenant_factory ON public.production_bags(tenant_id, factory_id);
CREATE INDEX idx_material_consumption_tenant_factory ON public.material_consumption(tenant_id, factory_id);
CREATE INDEX idx_events_tenant_factory_created_at ON public.events(tenant_id, factory_id, created_at DESC);
CREATE INDEX idx_events_aggregate ON public.events(aggregate_type, aggregate_id);
CREATE INDEX idx_alerts_tenant_factory_status ON public.alerts(tenant_id, factory_id, status);

-- ---------- Trigger helpers ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'events are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_factory(_factory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.factory_id = _factory_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin','gerente')
      AND ur.factory_id IS NULL
  );
$$;

-- Updated_at triggers
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mixers_updated_at BEFORE UPDATE ON public.mixers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_material_batches_updated_at BEFORE UPDATE ON public.material_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_locations_updated_at BEFORE UPDATE ON public.stock_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_balances_updated_at BEFORE UPDATE ON public.stock_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transfers_updated_at BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_separations_updated_at BEFORE UPDATE ON public.separations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_production_runs_updated_at BEFORE UPDATE ON public.production_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_production_plans_updated_at BEFORE UPDATE ON public.production_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutable events
CREATE TRIGGER trg_events_no_update BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.prevent_event_mutation();
CREATE TRIGGER trg_events_no_delete BEFORE DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.prevent_event_mutation();

-- ---------- RLS ----------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_yield_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_oee_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

-- Generic tenant/factory policies
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated USING (id = public.current_tenant_id());
CREATE POLICY tenants_update_admin ON public.tenants FOR UPDATE TO authenticated USING (id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY factories_read ON public.factories FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(id));
CREATE POLICY factories_manage ON public.factories FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() AND tenant_id = public.current_tenant_id()) WITH CHECK (id = auth.uid() AND tenant_id = public.current_tenant_id());

CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')));
CREATE POLICY user_roles_manage ON public.user_roles FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin'));

-- operational read/write helper policy template expanded per table
CREATE POLICY machines_read ON public.machines FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY machines_manage ON public.machines FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))) WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')));

CREATE POLICY mixers_read ON public.mixers FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY mixers_manage ON public.mixers FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))) WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')));

CREATE POLICY materials_read ON public.materials FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY materials_manage ON public.materials FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))) WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')));

CREATE POLICY material_batches_read ON public.material_batches FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY material_batches_manage ON public.material_batches FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operador'))) WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operador')));

CREATE POLICY stock_locations_read ON public.stock_locations FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY stock_locations_manage ON public.stock_locations FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))) WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')));

CREATE POLICY stock_balances_rw ON public.stock_balances FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY stock_movements_rw ON public.stock_movements FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY transfers_rw ON public.transfers FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY transfer_items_rw ON public.transfer_items FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY separations_rw ON public.separations FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY production_orders_rw ON public.production_orders FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY production_runs_rw ON public.production_runs FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY production_bags_rw ON public.production_bags FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY material_consumption_rw ON public.material_consumption FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));

CREATE POLICY events_read ON public.events FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND (factory_id IS NULL OR public.can_access_factory(factory_id)));
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() AND (factory_id IS NULL OR public.can_access_factory(factory_id)));

CREATE POLICY yield_metrics_rw ON public.production_yield_metrics FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY oee_metrics_rw ON public.machine_oee_metrics FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY alerts_rw ON public.alerts FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND (factory_id IS NULL OR public.can_access_factory(factory_id)));
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() AND (factory_id IS NULL OR public.can_access_factory(factory_id)));
CREATE POLICY demand_forecasts_rw ON public.demand_forecasts FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY production_plans_rw ON public.production_plans FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));

-- projections internal only (edge/service role)
ALTER TABLE public.projection_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_machine_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY projection_stock_read ON public.projection_stock_balances FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY projection_prod_read ON public.projection_production_summary FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));
CREATE POLICY projection_machine_read ON public.projection_machine_metrics FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id));