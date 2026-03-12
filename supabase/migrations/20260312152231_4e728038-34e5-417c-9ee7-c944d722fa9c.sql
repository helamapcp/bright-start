-- Core transactional RPCs for MES v1
-- 1) Material reception
CREATE OR REPLACE FUNCTION public.fn_create_material_reception(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_material_id uuid,
  p_batch_code text,
  p_received_kg numeric,
  p_location_code text DEFAULT 'CD',
  p_supplier text DEFAULT NULL,
  p_received_at timestamptz DEFAULT now(),
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_location_id uuid;
  v_batch_id uuid;
  v_existing_batch_id uuid;
  v_balance_id uuid;
  v_balance_qty numeric := 0;
  v_proj_id uuid;
  v_proj_qty numeric := 0;
  v_event_id uuid := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_material_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id and material_id are required';
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> v_user_id THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant mismatch';
  END IF;

  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  IF NOT (
    public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.has_role(v_user_id, 'gerente'::public.app_role)
    OR public.has_role(v_user_id, 'operador'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'insufficient role';
  END IF;

  IF p_batch_code IS NULL OR btrim(p_batch_code) = '' THEN
    RAISE EXCEPTION 'batch_code is required';
  END IF;

  IF p_received_kg IS NULL OR p_received_kg <= 0 THEN
    RAISE EXCEPTION 'received_kg must be greater than zero';
  END IF;

  PERFORM 1
  FROM public.materials m
  WHERE m.id = p_material_id
    AND m.tenant_id = p_tenant_id
    AND m.factory_id = p_factory_id
    AND m.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found or inactive for tenant/factory';
  END IF;

  SELECT sl.id
    INTO v_location_id
  FROM public.stock_locations sl
  WHERE sl.tenant_id = p_tenant_id
    AND sl.factory_id = p_factory_id
    AND upper(sl.code) = upper(p_location_code)
    AND sl.is_active = true
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'stock location % not found/active', p_location_code;
  END IF;

  -- Concurrency guard for duplicate batch reception
  SELECT mb.id
    INTO v_existing_batch_id
  FROM public.material_batches mb
  WHERE mb.tenant_id = p_tenant_id
    AND mb.factory_id = p_factory_id
    AND mb.material_id = p_material_id
    AND mb.batch_code = p_batch_code
  FOR UPDATE;

  IF v_existing_batch_id IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate batch_code for this material/factory';
  END IF;

  INSERT INTO public.material_batches (
    tenant_id, factory_id, material_id, batch_code,
    supplier, received_kg, remaining_kg, metadata, received_at
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, p_batch_code,
    p_supplier, p_received_kg, p_received_kg, COALESCE(p_metadata, '{}'::jsonb), COALESCE(p_received_at, now())
  )
  RETURNING id INTO v_batch_id;

  -- Lock/update stock balance projection source
  SELECT sb.id, sb.quantity_kg
    INTO v_balance_id, v_balance_qty
  FROM public.stock_balances sb
  WHERE sb.tenant_id = p_tenant_id
    AND sb.factory_id = p_factory_id
    AND sb.location_id = v_location_id
    AND sb.material_id = p_material_id
  FOR UPDATE;

  IF v_balance_id IS NULL THEN
    v_balance_qty := p_received_kg;
    INSERT INTO public.stock_balances (
      tenant_id, factory_id, location_id, material_id, quantity_kg, updated_by
    ) VALUES (
      p_tenant_id, p_factory_id, v_location_id, p_material_id, v_balance_qty, v_user_id
    )
    RETURNING id INTO v_balance_id;
  ELSE
    v_balance_qty := v_balance_qty + p_received_kg;
    UPDATE public.stock_balances
      SET quantity_kg = v_balance_qty,
          updated_by = v_user_id,
          updated_at = now()
    WHERE id = v_balance_id;
  END IF;

  -- Event
  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'MaterialReceived',
    'material_batch',
    v_batch_id,
    jsonb_build_object(
      'material_id', p_material_id,
      'batch_code', p_batch_code,
      'received_kg', p_received_kg,
      'location_id', v_location_id,
      'supplier', p_supplier,
      'received_at', COALESCE(p_received_at, now())
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  -- Projection update
  SELECT psb.id, psb.quantity_kg
    INTO v_proj_id, v_proj_qty
  FROM public.projection_stock_balances psb
  WHERE psb.tenant_id = p_tenant_id
    AND psb.factory_id = p_factory_id
    AND psb.location_id = v_location_id
    AND psb.material_id = p_material_id
  FOR UPDATE;

  IF v_proj_id IS NULL THEN
    v_proj_qty := v_balance_qty;
    INSERT INTO public.projection_stock_balances (
      tenant_id, factory_id, location_id, material_id, quantity_kg, last_event_id, updated_at
    ) VALUES (
      p_tenant_id, p_factory_id, v_location_id, p_material_id, v_proj_qty, v_event_id, now()
    ) RETURNING id INTO v_proj_id;
  ELSE
    v_proj_qty := v_proj_qty + p_received_kg;
    UPDATE public.projection_stock_balances
      SET quantity_kg = v_proj_qty,
          last_event_id = v_event_id,
          updated_at = now()
    WHERE id = v_proj_id;
  END IF;

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, batch_id,
    movement_type, quantity_kg, to_location_id, reference_id, reference_type,
    created_by, notes, created_at
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, v_batch_id,
    'material_reception', p_received_kg, v_location_id, v_batch_id, 'material_batch',
    COALESCE(p_created_by, v_user_id), 'Material reception at ' || upper(p_location_code), now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'material_batch_id', v_batch_id,
    'stock_balance', jsonb_build_object(
      'id', v_balance_id,
      'quantity_kg', v_balance_qty,
      'location_id', v_location_id,
      'material_id', p_material_id
    ),
    'projection_stock_balance', jsonb_build_object(
      'id', v_proj_id,
      'quantity_kg', v_proj_qty,
      'last_event_id', v_event_id
    ),
    'event_id', v_event_id
  );
END;
$$;

-- 2) Transfer request
CREATE OR REPLACE FUNCTION public.fn_create_transfer_request(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_from_location_code text,
  p_to_location_code text,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_requested_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_transfer_id uuid;
  v_from_location_id uuid;
  v_to_location_id uuid;
  v_event_id uuid := gen_random_uuid();
  v_item jsonb;
  v_item_id uuid;
  v_material_id uuid;
  v_batch_id uuid;
  v_requested_kg numeric;
  v_balance_id uuid;
  v_current_balance numeric;
  v_pending_requested numeric;
  v_available_to_request numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and factory_id are required';
  END IF;

  IF p_requested_by IS NOT NULL AND p_requested_by <> v_user_id THEN
    RAISE EXCEPTION 'requested_by must match authenticated user';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant mismatch';
  END IF;

  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  IF NOT (
    public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.has_role(v_user_id, 'gerente'::public.app_role)
    OR public.has_role(v_user_id, 'operador'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'insufficient role';
  END IF;

  IF p_from_location_code IS NULL OR p_to_location_code IS NULL THEN
    RAISE EXCEPTION 'from/to location codes are required';
  END IF;

  IF upper(p_from_location_code) = upper(p_to_location_code) THEN
    RAISE EXCEPTION 'from and to locations must be different';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items must be a non-empty array';
  END IF;

  SELECT id INTO v_from_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND upper(code) = upper(p_from_location_code)
    AND is_active = true
  LIMIT 1;

  SELECT id INTO v_to_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND upper(code) = upper(p_to_location_code)
    AND is_active = true
  LIMIT 1;

  IF v_from_location_id IS NULL OR v_to_location_id IS NULL THEN
    RAISE EXCEPTION 'invalid from/to location';
  END IF;

  INSERT INTO public.transfers (
    tenant_id, factory_id, from_location_id, to_location_id,
    requested_by, requested_at, status, notes
  ) VALUES (
    p_tenant_id, p_factory_id, v_from_location_id, v_to_location_id,
    COALESCE(p_requested_by, v_user_id), now(), 'requested', p_notes
  ) RETURNING id INTO v_transfer_id;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_material_id := (v_item->>'material_id')::uuid;
    v_batch_id := NULLIF(v_item->>'batch_id', '')::uuid;
    v_requested_kg := (v_item->>'requested_kg')::numeric;

    IF v_material_id IS NULL THEN
      RAISE EXCEPTION 'each item requires material_id';
    END IF;

    IF v_requested_kg IS NULL OR v_requested_kg <= 0 THEN
      RAISE EXCEPTION 'each item requested_kg must be > 0';
    END IF;

    PERFORM 1
    FROM public.materials m
    WHERE m.id = v_material_id
      AND m.tenant_id = p_tenant_id
      AND m.factory_id = p_factory_id
      AND m.is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'material % not found/active in tenant/factory', v_material_id;
    END IF;

    -- Optional batch lock and sufficiency
    IF v_batch_id IS NOT NULL THEN
      PERFORM 1
      FROM public.material_batches mb
      WHERE mb.id = v_batch_id
        AND mb.tenant_id = p_tenant_id
        AND mb.factory_id = p_factory_id
        AND mb.material_id = v_material_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'batch % not found for material/factory', v_batch_id;
      END IF;
    END IF;

    -- Lock current stock balance row
    SELECT sb.id, sb.quantity_kg
      INTO v_balance_id, v_current_balance
    FROM public.stock_balances sb
    WHERE sb.tenant_id = p_tenant_id
      AND sb.factory_id = p_factory_id
      AND sb.location_id = v_from_location_id
      AND sb.material_id = v_material_id
    FOR UPDATE;

    IF v_balance_id IS NULL THEN
      RAISE EXCEPTION 'no stock balance for material % at origin location', v_material_id;
    END IF;

    -- Pending transfer reservation check (requested - moved), serialized by row lock above
    SELECT COALESCE(SUM(ti.requested_kg - ti.moved_kg), 0)
      INTO v_pending_requested
    FROM public.transfer_items ti
    JOIN public.transfers t ON t.id = ti.transfer_id
    WHERE ti.tenant_id = p_tenant_id
      AND ti.factory_id = p_factory_id
      AND ti.material_id = v_material_id
      AND t.from_location_id = v_from_location_id
      AND t.status IN ('requested', 'in_progress')
      AND ti.status IN ('pending', 'partial');

    v_available_to_request := v_current_balance - v_pending_requested;

    IF v_available_to_request < v_requested_kg THEN
      RAISE EXCEPTION 'insufficient available stock for material % (available %, requested %)',
        v_material_id, v_available_to_request, v_requested_kg;
    END IF;

    INSERT INTO public.transfer_items (
      tenant_id, factory_id, transfer_id, material_id, batch_id,
      requested_kg, moved_kg, status
    ) VALUES (
      p_tenant_id, p_factory_id, v_transfer_id, v_material_id, v_batch_id,
      v_requested_kg, 0, 'pending'
    ) RETURNING id INTO v_item_id;
  END LOOP;

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'TransferRequested',
    'transfer',
    v_transfer_id,
    jsonb_build_object(
      'from_location_id', v_from_location_id,
      'to_location_id', v_to_location_id,
      'items', p_items,
      'notes', p_notes
    ),
    COALESCE(p_requested_by, v_user_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer', (
      SELECT row_to_json(t)
      FROM (
        SELECT tr.id, tr.status, tr.requested_at, tr.from_location_id, tr.to_location_id, tr.notes
        FROM public.transfers tr
        WHERE tr.id = v_transfer_id
      ) t
    ),
    'transfer_items', (
      SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      FROM (
        SELECT ti.id, ti.material_id, ti.batch_id, ti.requested_kg, ti.moved_kg, ti.status
        FROM public.transfer_items ti
        WHERE ti.transfer_id = v_transfer_id
        ORDER BY ti.created_at ASC
      ) x
    ),
    'event_id', v_event_id
  );
END;
$$;

-- 3) Start production run
CREATE OR REPLACE FUNCTION public.fn_start_production_run(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_order_id uuid,
  p_machine_id uuid,
  p_material_allocations jsonb,
  p_consumption_location_code text DEFAULT 'PMP',
  p_started_at timestamptz DEFAULT now(),
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_run_id uuid;
  v_event_id uuid := gen_random_uuid();
  v_order_status text;
  v_machine_status text;
  v_order_planned_kg numeric;
  v_consumption_location_id uuid;
  v_allocation jsonb;
  v_material_id uuid;
  v_batch_id uuid;
  v_qty numeric;
  v_balance_id uuid;
  v_balance_qty numeric;
  v_proj_id uuid;
  v_proj_qty numeric;
  v_proj_summary_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_production_order_id IS NULL OR p_machine_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id, production_order_id and machine_id are required';
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> v_user_id THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;

  IF p_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant mismatch';
  END IF;

  IF NOT public.can_access_factory(p_factory_id) THEN
    RAISE EXCEPTION 'factory access denied';
  END IF;

  IF NOT (
    public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.has_role(v_user_id, 'gerente'::public.app_role)
    OR public.has_role(v_user_id, 'operador'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'insufficient role';
  END IF;

  IF p_material_allocations IS NULL OR jsonb_typeof(p_material_allocations) <> 'array' OR jsonb_array_length(p_material_allocations) = 0 THEN
    RAISE EXCEPTION 'material_allocations must be a non-empty array';
  END IF;

  SELECT id INTO v_consumption_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND upper(code) = upper(p_consumption_location_code)
    AND is_active = true
  LIMIT 1;

  IF v_consumption_location_id IS NULL THEN
    RAISE EXCEPTION 'consumption location % not found/active', p_consumption_location_code;
  END IF;

  -- Lock and validate order
  SELECT po.status, po.planned_output_kg
    INTO v_order_status, v_order_planned_kg
  FROM public.production_orders po
  WHERE po.id = p_production_order_id
    AND po.tenant_id = p_tenant_id
    AND po.factory_id = p_factory_id
  FOR UPDATE;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'production order not found for tenant/factory';
  END IF;

  IF v_order_status NOT IN ('planned', 'released') THEN
    RAISE EXCEPTION 'production order status % cannot be started', v_order_status;
  END IF;

  -- Lock and validate machine
  SELECT m.status
    INTO v_machine_status
  FROM public.machines m
  WHERE m.id = p_machine_id
    AND m.tenant_id = p_tenant_id
    AND m.factory_id = p_factory_id
  FOR UPDATE;

  IF v_machine_status IS NULL THEN
    RAISE EXCEPTION 'machine not found for tenant/factory';
  END IF;

  IF v_machine_status <> 'available' THEN
    RAISE EXCEPTION 'machine status % is not available', v_machine_status;
  END IF;

  -- Guard against duplicate active runs for same order or machine
  PERFORM 1
  FROM public.production_runs pr
  WHERE pr.tenant_id = p_tenant_id
    AND pr.factory_id = p_factory_id
    AND (
      pr.production_order_id = p_production_order_id
      OR pr.machine_id = p_machine_id
    )
    AND pr.status IN ('created', 'running')
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'active run already exists for order or machine';
  END IF;

  INSERT INTO public.production_runs (
    tenant_id, factory_id, production_order_id, machine_id,
    status, started_at, planned_output_kg, actual_output_kg, scrap_kg, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_order_id, p_machine_id,
    'running', COALESCE(p_started_at, now()), COALESCE(v_order_planned_kg, 0), 0, 0, COALESCE(p_created_by, v_user_id)
  ) RETURNING id INTO v_run_id;

  UPDATE public.production_orders
    SET status = 'in_progress',
        machine_id = p_machine_id,
        updated_at = now()
  WHERE id = p_production_order_id;

  UPDATE public.machines
    SET status = 'in_production',
        updated_at = now()
  WHERE id = p_machine_id;

  -- Allocate materials immediately (reservation/consumption at start)
  FOR v_allocation IN
    SELECT value FROM jsonb_array_elements(p_material_allocations)
  LOOP
    v_material_id := (v_allocation->>'material_id')::uuid;
    v_batch_id := NULLIF(v_allocation->>'batch_id', '')::uuid;
    v_qty := (v_allocation->>'quantity_kg')::numeric;

    IF v_material_id IS NULL THEN
      RAISE EXCEPTION 'allocation item requires material_id';
    END IF;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'allocation quantity_kg must be > 0';
    END IF;

    PERFORM 1
    FROM public.materials m
    WHERE m.id = v_material_id
      AND m.tenant_id = p_tenant_id
      AND m.factory_id = p_factory_id
      AND m.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'material % not found/active in tenant/factory', v_material_id;
    END IF;

    IF v_batch_id IS NOT NULL THEN
      UPDATE public.material_batches mb
        SET remaining_kg = mb.remaining_kg - v_qty,
            updated_at = now()
      WHERE mb.id = v_batch_id
        AND mb.tenant_id = p_tenant_id
        AND mb.factory_id = p_factory_id
        AND mb.material_id = v_material_id
        AND mb.remaining_kg >= v_qty
      RETURNING mb.id INTO v_batch_id;

      IF v_batch_id IS NULL THEN
        RAISE EXCEPTION 'insufficient batch remaining for batch/material allocation';
      END IF;
    END IF;

    SELECT sb.id, sb.quantity_kg
      INTO v_balance_id, v_balance_qty
    FROM public.stock_balances sb
    WHERE sb.tenant_id = p_tenant_id
      AND sb.factory_id = p_factory_id
      AND sb.location_id = v_consumption_location_id
      AND sb.material_id = v_material_id
    FOR UPDATE;

    IF v_balance_id IS NULL OR v_balance_qty < v_qty THEN
      RAISE EXCEPTION 'insufficient stock for material % at location %', v_material_id, p_consumption_location_code;
    END IF;

    v_balance_qty := v_balance_qty - v_qty;
    UPDATE public.stock_balances
      SET quantity_kg = v_balance_qty,
          updated_by = COALESCE(p_created_by, v_user_id),
          updated_at = now()
    WHERE id = v_balance_id;

    SELECT psb.id, psb.quantity_kg
      INTO v_proj_id, v_proj_qty
    FROM public.projection_stock_balances psb
    WHERE psb.tenant_id = p_tenant_id
      AND psb.factory_id = p_factory_id
      AND psb.location_id = v_consumption_location_id
      AND psb.material_id = v_material_id
    FOR UPDATE;

    IF v_proj_id IS NULL THEN
      v_proj_qty := v_balance_qty;
      INSERT INTO public.projection_stock_balances (
        tenant_id, factory_id, location_id, material_id, quantity_kg, last_event_id, updated_at
      ) VALUES (
        p_tenant_id, p_factory_id, v_consumption_location_id, v_material_id, v_proj_qty, v_event_id, now()
      ) RETURNING id INTO v_proj_id;
    ELSE
      v_proj_qty := v_proj_qty - v_qty;
      UPDATE public.projection_stock_balances
        SET quantity_kg = v_proj_qty,
            last_event_id = v_event_id,
            updated_at = now()
      WHERE id = v_proj_id;
    END IF;

    INSERT INTO public.material_consumption (
      tenant_id, factory_id, production_run_id, material_id, batch_id,
      bag_id, consumed_kg, consumed_at, created_by
    ) VALUES (
      p_tenant_id, p_factory_id, v_run_id, v_material_id, v_batch_id,
      NULL, v_qty, COALESCE(p_started_at, now()), COALESCE(p_created_by, v_user_id)
    );

    INSERT INTO public.stock_movements (
      tenant_id, factory_id, material_id, batch_id,
      movement_type, quantity_kg, from_location_id, reference_id, reference_type,
      created_by, notes, created_at
    ) VALUES (
      p_tenant_id, p_factory_id, v_material_id, v_batch_id,
      'production_allocation', -v_qty, v_consumption_location_id, v_run_id, 'production_run',
      COALESCE(p_created_by, v_user_id), 'Material allocated at production start', now()
    );
  END LOOP;

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'ProductionStarted',
    'production_run',
    v_run_id,
    jsonb_build_object(
      'production_order_id', p_production_order_id,
      'machine_id', p_machine_id,
      'started_at', COALESCE(p_started_at, now()),
      'material_allocations', p_material_allocations,
      'consumption_location_id', v_consumption_location_id
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  INSERT INTO public.projection_production_summary (
    tenant_id, factory_id, production_run_id, output_kg, scrap_kg, yield_ratio, updated_at
  ) VALUES (
    p_tenant_id, p_factory_id, v_run_id, 0, 0, 0, now()
  ) RETURNING id INTO v_proj_summary_id;

  RETURN jsonb_build_object(
    'success', true,
    'production_run', (
      SELECT row_to_json(r)
      FROM (
        SELECT pr.id, pr.production_order_id, pr.machine_id, pr.status, pr.started_at, pr.planned_output_kg, pr.actual_output_kg, pr.scrap_kg
        FROM public.production_runs pr
        WHERE pr.id = v_run_id
      ) r
    ),
    'projection_production_summary', jsonb_build_object(
      'id', v_proj_summary_id,
      'production_run_id', v_run_id,
      'output_kg', 0,
      'scrap_kg', 0,
      'yield_ratio', 0
    ),
    'event_id', v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_material_reception(uuid, uuid, uuid, text, numeric, text, text, timestamptz, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_transfer_request(uuid, uuid, text, text, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_start_production_run(uuid, uuid, uuid, uuid, jsonb, text, timestamptz, uuid) TO authenticated;