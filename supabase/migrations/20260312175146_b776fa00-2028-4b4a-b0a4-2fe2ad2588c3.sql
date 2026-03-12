-- === CORE ROLE MODEL ===
create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'app_role' AND n.nspname = 'public') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'operador', 'estoque');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- === REQUIRED TABLES ===
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_code text NOT NULL,
  material_name text NOT NULL,
  unit text NOT NULL DEFAULT 'KG',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, material_code)
);

CREATE TABLE IF NOT EXISTS public.material_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  batch_code text NOT NULL,
  received_kg numeric NOT NULL DEFAULT 0,
  available_kg numeric NOT NULL DEFAULT 0,
  supplier text,
  received_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, material_id, batch_code)
);

ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.stock_locations sl
SET tenant_id = f.tenant_id
FROM public.factories f
WHERE sl.factory_id = f.id
  AND sl.tenant_id IS NULL;

UPDATE public.stock_locations
SET code = upper(coalesce(code, name))
WHERE code IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.stock_locations WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'stock_locations.tenant_id has null values';
  END IF;
  ALTER TABLE public.stock_locations ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- keep migration non-destructive if unexpected legacy data appears
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_locations_tenant_id_fkey'
      AND conrelid = 'public.stock_locations'::regclass
  ) THEN
    ALTER TABLE public.stock_locations
      ADD CONSTRAINT stock_locations_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_locations_tenant_factory_code
  ON public.stock_locations (tenant_id, factory_id, code);

ALTER TABLE public.stock_balances ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.material_batches(id) ON DELETE SET NULL;

UPDATE public.stock_balances sb
SET factory_id = sl.factory_id
FROM public.stock_locations sl
WHERE sb.location_id = sl.id
  AND sb.factory_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stock_balances' AND column_name='factory_id' AND is_nullable='NO'
  ) AND NOT EXISTS (SELECT 1 FROM public.stock_balances WHERE factory_id IS NULL) THEN
    ALTER TABLE public.stock_balances ALTER COLUMN factory_id SET NOT NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.material_batches(id) ON DELETE SET NULL,
  from_location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity_kg numeric NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  related_transfer_id uuid,
  related_production_run_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  from_location_id uuid NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  to_location_id uuid NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'REQUESTED',
  notes text,
  requested_by uuid,
  approved_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_request_id uuid NOT NULL REFERENCES public.transfer_requests(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.material_batches(id) ON DELETE SET NULL,
  requested_kg numeric NOT NULL,
  approved_kg numeric,
  transferred_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  machine_code text NOT NULL,
  machine_name text NOT NULL,
  nominal_capacity_kg_h numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, machine_code)
);

CREATE TABLE IF NOT EXISTS public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  order_code text NOT NULL,
  product_name text NOT NULL,
  planned_output_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PLANNED',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, order_code)
);

CREATE TABLE IF NOT EXISTS public.production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE RESTRICT,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  planned_output_kg numeric NOT NULL DEFAULT 0,
  actual_output_kg numeric NOT NULL DEFAULT 0,
  scrap_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'RUNNING',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.material_batches(id) ON DELETE SET NULL,
  consumed_kg numeric NOT NULL,
  consumption_location_id uuid REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.production_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  weight_kg numeric NOT NULL,
  location_id uuid NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projection_stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.stock_locations(id) ON DELETE CASCADE,
  quantity_kg numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, material_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.projection_production_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  planned_output_kg numeric NOT NULL DEFAULT 0,
  actual_output_kg numeric NOT NULL DEFAULT 0,
  scrap_kg numeric NOT NULL DEFAULT 0,
  yield_pct numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, factory_id, production_run_id)
);

CREATE TABLE IF NOT EXISTS public.projection_machine_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  availability_pct numeric,
  performance_pct numeric,
  quality_pct numeric,
  oee_pct numeric,
  last_calculated_at timestamptz,
  UNIQUE (tenant_id, factory_id, machine_id)
);

CREATE TABLE IF NOT EXISTS public.production_yield_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  yield_pct numeric NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by uuid,
  UNIQUE (tenant_id, factory_id, production_run_id)
);

CREATE TABLE IF NOT EXISTS public.machine_oee_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  production_run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  availability_pct numeric NOT NULL,
  performance_pct numeric NOT NULL,
  quality_pct numeric NOT NULL,
  oee_pct numeric NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by uuid,
  UNIQUE (tenant_id, factory_id, production_run_id)
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_events_tenant_factory ON public.events (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_tenant_factory ON public.stock_balances (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_tenant_factory ON public.stock_locations (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_factory ON public.materials (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_tenant_factory ON public.material_batches (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_factory ON public.stock_movements (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_tenant_factory ON public.transfer_requests (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_tenant_factory ON public.transfer_items (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_machines_tenant_factory ON public.machines (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_factory ON public.production_orders (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_runs_tenant_factory ON public.production_runs (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_consumption_tenant_factory ON public.material_consumption (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_bags_tenant_factory ON public.production_bags (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_proj_stock_tenant_factory ON public.projection_stock_balances (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_proj_prod_tenant_factory ON public.projection_production_summary (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_proj_machine_tenant_factory ON public.projection_machine_metrics (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_yield_tenant_factory ON public.production_yield_metrics (tenant_id, factory_id);
CREATE INDEX IF NOT EXISTS idx_oee_tenant_factory ON public.machine_oee_metrics (tenant_id, factory_id);

-- === AUTH HELPERS ===
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ut.tenant_id
  FROM public.user_tenants ut
  WHERE ut.user_id = auth.uid()
  ORDER BY ut.created_at DESC NULLS LAST
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_factory(_factory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_factories uf
      WHERE uf.user_id = auth.uid()
        AND uf.factory_id = _factory_id
    )
$$;

CREATE OR REPLACE FUNCTION public.ensure_stock_location(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_location_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
  v_code text := upper(trim(coalesce(p_location_code, '')));
BEGIN
  IF v_code = '' THEN
    RAISE EXCEPTION 'location code is required';
  END IF;

  SELECT id INTO v_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND code = v_code
  LIMIT 1;

  IF v_location_id IS NULL THEN
    INSERT INTO public.stock_locations (id, tenant_id, factory_id, name, code, is_active)
    VALUES (gen_random_uuid(), p_tenant_id, p_factory_id, v_code, v_code, true)
    RETURNING id INTO v_location_id;
  END IF;

  RETURN v_location_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_projection_stock(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_material_id uuid,
  p_location_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty numeric;
BEGIN
  SELECT coalesce(quantity_kg, 0)
    INTO v_qty
  FROM public.stock_balances
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND material_id = p_material_id
    AND location_id = p_location_id;

  INSERT INTO public.projection_stock_balances (tenant_id, factory_id, material_id, location_id, quantity_kg, updated_at)
  VALUES (p_tenant_id, p_factory_id, p_material_id, p_location_id, coalesce(v_qty, 0), now())
  ON CONFLICT (tenant_id, factory_id, material_id, location_id)
  DO UPDATE SET quantity_kg = excluded.quantity_kg, updated_at = now();
END;
$$;

-- === BUSINESS RPCs ===
CREATE OR REPLACE FUNCTION public.fn_create_material_reception(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_material_id uuid,
  p_batch_code text,
  p_received_kg numeric,
  p_location_code text DEFAULT 'CD',
  p_supplier text DEFAULT NULL,
  p_received_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
  v_batch_id uuid;
  v_event_id uuid;
BEGIN
  IF p_received_kg <= 0 THEN
    RAISE EXCEPTION 'received kg must be > 0';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  v_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, coalesce(p_location_code, 'CD'));

  INSERT INTO public.material_batches (
    tenant_id, factory_id, material_id, batch_code, received_kg, available_kg, supplier, received_at, metadata, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, trim(p_batch_code), p_received_kg, p_received_kg,
    p_supplier, coalesce(p_received_at, now()), coalesce(p_metadata, '{}'::jsonb), p_created_by
  )
  ON CONFLICT (tenant_id, factory_id, material_id, batch_code)
  DO UPDATE SET
    received_kg = public.material_batches.received_kg + excluded.received_kg,
    available_kg = public.material_batches.available_kg + excluded.available_kg,
    supplier = coalesce(excluded.supplier, public.material_batches.supplier),
    metadata = public.material_batches.metadata || excluded.metadata
  RETURNING id INTO v_batch_id;

  INSERT INTO public.stock_balances (tenant_id, factory_id, material_id, location_id, batch_id, quantity_kg, updated_at)
  VALUES (p_tenant_id, p_factory_id, p_material_id, v_location_id, v_batch_id, p_received_kg, now())
  ON CONFLICT (material_id, location_id, factory_id)
  DO UPDATE SET quantity_kg = public.stock_balances.quantity_kg + excluded.quantity_kg, updated_at = now();

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'material.reception.created', 'material_batch', v_batch_id,
    jsonb_build_object('material_id', p_material_id, 'batch_id', v_batch_id, 'location_id', v_location_id, 'received_kg', p_received_kg),
    p_created_by
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, batch_id, to_location_id, movement_type, quantity_kg, created_by, metadata
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, v_batch_id, v_location_id, 'RECEPTION', p_received_kg, p_created_by,
    jsonb_build_object('event_id', v_event_id)
  );

  PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, p_material_id, v_location_id);

  RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'location_id', v_location_id, 'event_id', v_event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_transfer_request(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_from_location_code text,
  p_to_location_code text,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
  v_from_location_id uuid;
  v_to_location_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_batch_id uuid;
  v_qty numeric;
  v_current numeric;
BEGIN
  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  v_from_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, p_from_location_code);
  v_to_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, p_to_location_code);

  INSERT INTO public.transfer_requests (
    tenant_id, factory_id, from_location_id, to_location_id, status, notes, requested_by, approved_by, approved_at
  ) VALUES (
    p_tenant_id, p_factory_id, v_from_location_id, v_to_location_id, 'COMPLETED', p_notes, p_requested_by, p_requested_by, now()
  ) RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_batch_id := nullif(v_item->>'batch_id', '')::uuid;
    v_qty := (v_item->>'requested_kg')::numeric;

    IF v_material_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid transfer item';
    END IF;

    SELECT quantity_kg INTO v_current
    FROM public.stock_balances
    WHERE tenant_id = p_tenant_id
      AND factory_id = p_factory_id
      AND material_id = v_material_id
      AND location_id = v_from_location_id
    FOR UPDATE;

    IF coalesce(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'insufficient stock for material % at source location', v_material_id;
    END IF;

    UPDATE public.stock_balances
      SET quantity_kg = quantity_kg - v_qty,
          updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND factory_id = p_factory_id
      AND material_id = v_material_id
      AND location_id = v_from_location_id;

    INSERT INTO public.stock_balances (tenant_id, factory_id, material_id, location_id, quantity_kg, updated_at)
    VALUES (p_tenant_id, p_factory_id, v_material_id, v_to_location_id, v_qty, now())
    ON CONFLICT (material_id, location_id, factory_id)
    DO UPDATE SET quantity_kg = public.stock_balances.quantity_kg + excluded.quantity_kg,
                  updated_at = now();

    INSERT INTO public.transfer_items (
      transfer_request_id, tenant_id, factory_id, material_id, batch_id, requested_kg, approved_kg, transferred_kg
    ) VALUES (
      v_transfer_id, p_tenant_id, p_factory_id, v_material_id, v_batch_id, v_qty, v_qty, v_qty
    );

    INSERT INTO public.stock_movements (
      tenant_id, factory_id, material_id, batch_id, from_location_id, to_location_id, movement_type, quantity_kg, created_by, related_transfer_id
    ) VALUES (
      p_tenant_id, p_factory_id, v_material_id, v_batch_id, v_from_location_id, v_to_location_id, 'TRANSFER', v_qty, p_requested_by, v_transfer_id
    );

    PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, v_material_id, v_from_location_id);
    PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, v_material_id, v_to_location_id);
  END LOOP;

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'stock.transfer.completed', 'transfer_request', v_transfer_id,
    jsonb_build_object('from_location_id', v_from_location_id, 'to_location_id', v_to_location_id, 'items', p_items),
    p_requested_by
  );

  RETURN jsonb_build_object('success', true, 'transfer_request_id', v_transfer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_start_production_run(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_order_id uuid,
  p_machine_id uuid,
  p_material_allocations jsonb,
  p_consumption_location_code text DEFAULT 'PMP',
  p_started_at timestamptz DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_location_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty numeric;
  v_batch_id uuid;
  v_current numeric;
  v_planned numeric;
BEGIN
  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  SELECT planned_output_kg INTO v_planned
  FROM public.production_orders
  WHERE id = p_production_order_id
    AND tenant_id = p_tenant_id
    AND factory_id = p_factory_id;

  IF v_planned IS NULL THEN
    RAISE EXCEPTION 'production order not found';
  END IF;

  v_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, p_consumption_location_code);

  INSERT INTO public.production_runs (
    tenant_id, factory_id, production_order_id, machine_id, planned_output_kg, status, started_at, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_order_id, p_machine_id, coalesce(v_planned, 0), 'RUNNING', coalesce(p_started_at, now()), p_created_by
  ) RETURNING id INTO v_run_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_material_allocations)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_batch_id := nullif(v_item->>'batch_id', '')::uuid;
    v_qty := (v_item->>'quantity_kg')::numeric;

    IF v_material_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid material allocation';
    END IF;

    SELECT quantity_kg INTO v_current
    FROM public.stock_balances
    WHERE tenant_id = p_tenant_id
      AND factory_id = p_factory_id
      AND material_id = v_material_id
      AND location_id = v_location_id
    FOR UPDATE;

    IF coalesce(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'insufficient stock to start production run for material %', v_material_id;
    END IF;

    UPDATE public.stock_balances
    SET quantity_kg = quantity_kg - v_qty,
        updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND factory_id = p_factory_id
      AND material_id = v_material_id
      AND location_id = v_location_id;

    INSERT INTO public.material_consumption (
      tenant_id, factory_id, production_run_id, material_id, batch_id, consumed_kg, consumption_location_id, consumed_at, created_by
    ) VALUES (
      p_tenant_id, p_factory_id, v_run_id, v_material_id, v_batch_id, v_qty, v_location_id, coalesce(p_started_at, now()), p_created_by
    );

    INSERT INTO public.stock_movements (
      tenant_id, factory_id, material_id, batch_id, from_location_id, movement_type, quantity_kg, created_by, related_production_run_id
    ) VALUES (
      p_tenant_id, p_factory_id, v_material_id, v_batch_id, v_location_id, 'CONSUMPTION', v_qty, p_created_by, v_run_id
    );

    PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, v_material_id, v_location_id);
  END LOOP;

  INSERT INTO public.projection_production_summary (
    tenant_id, factory_id, production_run_id, machine_id, planned_output_kg, actual_output_kg, scrap_kg, updated_at
  ) VALUES (
    p_tenant_id, p_factory_id, v_run_id, p_machine_id, coalesce(v_planned, 0), 0, 0, now()
  )
  ON CONFLICT (tenant_id, factory_id, production_run_id)
  DO UPDATE SET updated_at = now();

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'production.run.started', 'production_run', v_run_id,
    jsonb_build_object('production_order_id', p_production_order_id, 'machine_id', p_machine_id),
    p_created_by
  );

  RETURN jsonb_build_object('success', true, 'production_run_id', v_run_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_consume_material(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_material_id uuid,
  p_consumed_kg numeric,
  p_batch_id uuid DEFAULT NULL,
  p_consumption_location_code text DEFAULT 'PMP',
  p_consumed_at timestamptz DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
  v_current numeric;
BEGIN
  IF p_consumed_kg <= 0 THEN
    RAISE EXCEPTION 'consumed_kg must be > 0';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  v_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, p_consumption_location_code);

  SELECT quantity_kg INTO v_current
  FROM public.stock_balances
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND material_id = p_material_id
    AND location_id = v_location_id
  FOR UPDATE;

  IF coalesce(v_current, 0) < p_consumed_kg THEN
    RAISE EXCEPTION 'insufficient stock for material consumption';
  END IF;

  UPDATE public.stock_balances
  SET quantity_kg = quantity_kg - p_consumed_kg,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND material_id = p_material_id
    AND location_id = v_location_id;

  INSERT INTO public.material_consumption (
    tenant_id, factory_id, production_run_id, material_id, batch_id, consumed_kg, consumption_location_id, consumed_at, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, p_material_id, p_batch_id, p_consumed_kg, v_location_id, coalesce(p_consumed_at, now()), p_created_by
  );

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, batch_id, from_location_id, movement_type, quantity_kg, created_by, related_production_run_id
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, p_batch_id, v_location_id, 'CONSUMPTION', p_consumed_kg, p_created_by, p_production_run_id
  );

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'production.material.consumed', 'production_run', p_production_run_id,
    jsonb_build_object('material_id', p_material_id, 'consumed_kg', p_consumed_kg),
    p_created_by
  );

  PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, p_material_id, v_location_id);

  RETURN jsonb_build_object('success', true, 'production_run_id', p_production_run_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_register_produced_bag(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_material_id uuid,
  p_weight_kg numeric,
  p_location_code text DEFAULT 'FLOOR',
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id uuid;
  v_bag_id uuid;
BEGIN
  IF p_weight_kg <= 0 THEN
    RAISE EXCEPTION 'weight_kg must be > 0';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  v_location_id := public.ensure_stock_location(p_tenant_id, p_factory_id, p_location_code);

  INSERT INTO public.production_bags (
    tenant_id, factory_id, production_run_id, material_id, weight_kg, location_id, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, p_material_id, p_weight_kg, v_location_id, p_created_by
  ) RETURNING id INTO v_bag_id;

  INSERT INTO public.stock_balances (tenant_id, factory_id, material_id, location_id, quantity_kg, updated_at)
  VALUES (p_tenant_id, p_factory_id, p_material_id, v_location_id, p_weight_kg, now())
  ON CONFLICT (material_id, location_id, factory_id)
  DO UPDATE SET quantity_kg = public.stock_balances.quantity_kg + excluded.quantity_kg,
                updated_at = now();

  UPDATE public.production_runs
  SET actual_output_kg = coalesce(actual_output_kg, 0) + p_weight_kg
  WHERE id = p_production_run_id
    AND tenant_id = p_tenant_id
    AND factory_id = p_factory_id;

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, to_location_id, movement_type, quantity_kg, created_by, related_production_run_id
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, v_location_id, 'PRODUCTION_OUTPUT', p_weight_kg, p_created_by, p_production_run_id
  );

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'production.bag.registered', 'production_bag', v_bag_id,
    jsonb_build_object('production_run_id', p_production_run_id, 'material_id', p_material_id, 'weight_kg', p_weight_kg),
    p_created_by
  );

  INSERT INTO public.projection_production_summary (
    tenant_id, factory_id, production_run_id, machine_id, planned_output_kg, actual_output_kg, scrap_kg, updated_at
  )
  SELECT pr.tenant_id, pr.factory_id, pr.id, pr.machine_id, pr.planned_output_kg, pr.actual_output_kg, pr.scrap_kg, now()
  FROM public.production_runs pr
  WHERE pr.id = p_production_run_id
  ON CONFLICT (tenant_id, factory_id, production_run_id)
  DO UPDATE SET
    actual_output_kg = excluded.actual_output_kg,
    scrap_kg = excluded.scrap_kg,
    updated_at = now();

  PERFORM public.refresh_projection_stock(p_tenant_id, p_factory_id, p_material_id, v_location_id);

  RETURN jsonb_build_object('success', true, 'bag_id', v_bag_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calculate_yield(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_planned numeric;
  v_actual numeric;
  v_scrap numeric;
  v_yield numeric;
BEGIN
  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  SELECT planned_output_kg, actual_output_kg, scrap_kg
    INTO v_planned, v_actual, v_scrap
  FROM public.production_runs
  WHERE id = p_production_run_id
    AND tenant_id = p_tenant_id
    AND factory_id = p_factory_id;

  IF v_planned IS NULL THEN
    RAISE EXCEPTION 'production run not found';
  END IF;

  v_yield := CASE WHEN coalesce(v_planned, 0) <= 0 THEN 0 ELSE round((coalesce(v_actual,0) / v_planned) * 100, 2) END;

  INSERT INTO public.production_yield_metrics (
    tenant_id, factory_id, production_run_id, yield_pct, calculated_at, calculated_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, v_yield, now(), p_created_by
  )
  ON CONFLICT (tenant_id, factory_id, production_run_id)
  DO UPDATE SET yield_pct = excluded.yield_pct, calculated_at = now(), calculated_by = excluded.calculated_by;

  UPDATE public.projection_production_summary
  SET yield_pct = v_yield,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND production_run_id = p_production_run_id;

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'production.yield.calculated', 'production_run', p_production_run_id,
    jsonb_build_object('yield_pct', v_yield),
    p_created_by
  );

  RETURN jsonb_build_object('success', true, 'yield_pct', v_yield);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calculate_oee(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_id uuid;
  v_planned numeric;
  v_actual numeric;
  v_scrap numeric;
  v_availability numeric := 100;
  v_performance numeric;
  v_quality numeric;
  v_oee numeric;
BEGIN
  IF p_tenant_id <> public.current_tenant_id() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  SELECT machine_id, planned_output_kg, actual_output_kg, scrap_kg
    INTO v_machine_id, v_planned, v_actual, v_scrap
  FROM public.production_runs
  WHERE id = p_production_run_id
    AND tenant_id = p_tenant_id
    AND factory_id = p_factory_id;

  IF v_machine_id IS NULL THEN
    RAISE EXCEPTION 'production run not found';
  END IF;

  v_performance := CASE WHEN coalesce(v_planned,0) <= 0 THEN 0 ELSE round((coalesce(v_actual,0) / v_planned) * 100, 2) END;
  v_quality := CASE WHEN coalesce(v_actual,0) <= 0 THEN 0 ELSE round(((coalesce(v_actual,0) - coalesce(v_scrap,0)) / v_actual) * 100, 2) END;
  v_oee := round((v_availability * v_performance * v_quality) / 10000, 2);

  INSERT INTO public.machine_oee_metrics (
    tenant_id, factory_id, production_run_id, machine_id, availability_pct, performance_pct, quality_pct, oee_pct, calculated_at, calculated_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, v_machine_id, v_availability, v_performance, v_quality, v_oee, now(), p_created_by
  )
  ON CONFLICT (tenant_id, factory_id, production_run_id)
  DO UPDATE SET
    machine_id = excluded.machine_id,
    availability_pct = excluded.availability_pct,
    performance_pct = excluded.performance_pct,
    quality_pct = excluded.quality_pct,
    oee_pct = excluded.oee_pct,
    calculated_at = now(),
    calculated_by = excluded.calculated_by;

  INSERT INTO public.projection_machine_metrics (
    tenant_id, factory_id, machine_id, availability_pct, performance_pct, quality_pct, oee_pct, last_calculated_at
  ) VALUES (
    p_tenant_id, p_factory_id, v_machine_id, v_availability, v_performance, v_quality, v_oee, now()
  )
  ON CONFLICT (tenant_id, factory_id, machine_id)
  DO UPDATE SET
    availability_pct = excluded.availability_pct,
    performance_pct = excluded.performance_pct,
    quality_pct = excluded.quality_pct,
    oee_pct = excluded.oee_pct,
    last_calculated_at = now();

  INSERT INTO public.events (tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by)
  VALUES (
    p_tenant_id, p_factory_id, 'machine.oee.calculated', 'production_run', p_production_run_id,
    jsonb_build_object('machine_id', v_machine_id, 'oee_pct', v_oee),
    p_created_by
  );

  RETURN jsonb_build_object('success', true, 'machine_id', v_machine_id, 'oee_pct', v_oee);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_material_reception(uuid, uuid, uuid, text, numeric, text, text, timestamptz, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_transfer_request(uuid, uuid, text, text, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_start_production_run(uuid, uuid, uuid, uuid, jsonb, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_consume_material(uuid, uuid, uuid, uuid, numeric, uuid, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_register_produced_bag(uuid, uuid, uuid, uuid, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calculate_yield(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calculate_oee(uuid, uuid, uuid, uuid) TO authenticated;

-- === RLS ===
DO $$
DECLARE
  tbl text;
  scoped_tables text[] := array[
    'events','stock_locations','stock_balances','materials','material_batches','stock_movements',
    'transfer_requests','transfer_items','machines','production_orders','production_runs',
    'material_consumption','production_bags','projection_stock_balances','projection_production_summary',
    'projection_machine_metrics','production_yield_metrics','machine_oee_metrics'
  ];
BEGIN
  FOREACH tbl IN ARRAY scoped_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname=tbl || '_select_scope') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id))', tbl || '_select_scope', tbl);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname=tbl || '_insert_scope') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id))', tbl || '_insert_scope', tbl);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname=tbl || '_update_scope') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id)) WITH CHECK (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id))', tbl || '_update_scope', tbl);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname=tbl || '_delete_scope') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(factory_id))', tbl || '_delete_scope', tbl);
    END IF;
  END LOOP;
END$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_select_own') THEN
    CREATE POLICY tenants_select_own ON public.tenants FOR SELECT TO authenticated
    USING (id = public.current_tenant_id() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='factories' AND policyname='factories_select_scope') THEN
    CREATE POLICY factories_select_scope ON public.factories FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id() AND public.can_access_factory(id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='roles_select_all') THEN
    CREATE POLICY roles_select_all ON public.roles FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_select_scope') THEN
    CREATE POLICY users_select_scope ON public.users FOR SELECT TO authenticated
    USING ((id = auth.uid()) OR (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_insert_admin') THEN
    CREATE POLICY users_insert_admin ON public.users FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update_self_or_admin') THEN
    CREATE POLICY users_update_self_or_admin ON public.users FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_tenants' AND policyname='user_tenants_select') THEN
    CREATE POLICY user_tenants_select ON public.user_tenants FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_tenants' AND policyname='user_tenants_insert_admin') THEN
    CREATE POLICY user_tenants_insert_admin ON public.user_tenants FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_factories' AND policyname='user_factories_select') THEN
    CREATE POLICY user_factories_select ON public.user_factories FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_factories' AND policyname='user_factories_insert_admin') THEN
    CREATE POLICY user_factories_insert_admin ON public.user_factories FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_select') THEN
    CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_insert_admin') THEN
    CREATE POLICY user_roles_insert_admin ON public.user_roles FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_self') THEN
    CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_upsert_self') THEN
    CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self') THEN
    CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- === SEED DATA / DEFAULTS ===
INSERT INTO public.tenants (id, tenant_name, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'ACME Industries', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET tenant_name = excluded.tenant_name, status = excluded.status;

INSERT INTO public.factories (id, tenant_id, factory_name, location, timezone)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Factory A', 'Main Site', 'America/Sao_Paulo')
ON CONFLICT (id) DO UPDATE SET tenant_id = excluded.tenant_id, factory_name = excluded.factory_name;

INSERT INTO public.roles (id, name, permissions)
VALUES
  ('21000000-0000-0000-0000-000000000001', 'admin', '{"all": true}'::jsonb),
  ('21000000-0000-0000-0000-000000000002', 'gerente', '{"dashboard": true, "planning": true, "production": true}'::jsonb),
  ('21000000-0000-0000-0000-000000000003', 'operador', '{"production": true}'::jsonb),
  ('21000000-0000-0000-0000-000000000004', 'estoque', '{"inventory": true, "transfer": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = excluded.name, permissions = excluded.permissions;

INSERT INTO public.stock_locations (id, tenant_id, factory_id, name, code, is_active)
VALUES
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CD', 'CD', true),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PCP', 'PCP', true),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PMP', 'PMP', true),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'FLOOR', 'FLOOR', true)
ON CONFLICT (id) DO UPDATE SET tenant_id = excluded.tenant_id, factory_id = excluded.factory_id, name = excluded.name, code = excluded.code, is_active = excluded.is_active;

INSERT INTO public.machines (id, tenant_id, factory_id, machine_code, machine_name, nominal_capacity_kg_h)
VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MIX-01', 'Mixer 01', 1000),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MIX-02', 'Mixer 02', 900)
ON CONFLICT (id) DO UPDATE SET machine_name = excluded.machine_name, nominal_capacity_kg_h = excluded.nominal_capacity_kg_h;

-- Public app users expected by frontend + test users
INSERT INTO public.users (id, email, name, role_id, tenant_id, factory_id)
VALUES
  ('4baa5491-c8d6-4886-a75d-0cce31e7ac59', 'adminuser@acme.com', 'Admin User', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000001', 'admin@demo.com', 'Demo Admin', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', 'gerente@demo.com', 'Demo Gerente', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', 'operador@demo.com', 'Demo Operador', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', 'estoque@demo.com', 'Demo Estoque', '21000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  role_id = excluded.role_id,
  tenant_id = excluded.tenant_id,
  factory_id = excluded.factory_id;

INSERT INTO public.user_tenants (user_id, tenant_id, role_id)
VALUES
  ('4baa5491-c8d6-4886-a75d-0cce31e7ac59', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002'),
  ('31000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003'),
  ('31000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000004')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = excluded.role_id;

INSERT INTO public.user_factories (user_id, factory_id)
VALUES
  ('4baa5491-c8d6-4886-a75d-0cce31e7ac59', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, factory_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('4baa5491-c8d6-4886-a75d-0cce31e7ac59', 'admin'),
  ('31000000-0000-0000-0000-000000000001', 'admin'),
  ('31000000-0000-0000-0000-000000000002', 'gerente'),
  ('31000000-0000-0000-0000-000000000003', 'operador'),
  ('31000000-0000-0000-0000-000000000004', 'estoque')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES
  ('4baa5491-c8d6-4886-a75d-0cce31e7ac59', 'adminuser@acme.com', 'Admin User'),
  ('31000000-0000-0000-0000-000000000001', 'admin@demo.com', 'Demo Admin'),
  ('31000000-0000-0000-0000-000000000002', 'gerente@demo.com', 'Demo Gerente'),
  ('31000000-0000-0000-0000-000000000003', 'operador@demo.com', 'Demo Operador'),
  ('31000000-0000-0000-0000-000000000004', 'estoque@demo.com', 'Demo Estoque')
ON CONFLICT (id) DO UPDATE SET email = excluded.email, full_name = excluded.full_name, updated_at = now();