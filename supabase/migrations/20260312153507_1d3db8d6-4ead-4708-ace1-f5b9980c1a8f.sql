-- MES v2 RPC package: registerProducedBag, consumeMaterial, calculateYield, calculateOEE

CREATE OR REPLACE FUNCTION public.fn_register_produced_bag(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_material_id uuid,
  p_weight_kg numeric,
  p_location_code text DEFAULT 'FLOOR',
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_event_id uuid := gen_random_uuid();
  v_bag_id uuid;
  v_bag_code text;
  v_location_id uuid;
  v_run_status text;
  v_output_kg numeric;
  v_proj_summary_id uuid;
  v_consumed_kg numeric;
  v_new_yield numeric;
  v_balance_id uuid;
  v_balance_qty numeric;
  v_proj_id uuid;
  v_proj_qty numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_production_run_id IS NULL OR p_material_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id, production_run_id and material_id are required';
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

  IF p_weight_kg IS NULL OR p_weight_kg <= 0 THEN
    RAISE EXCEPTION 'weight_kg must be > 0';
  END IF;

  SELECT id INTO v_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND upper(code) = upper(p_location_code)
    AND is_active = true
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'location % not found/active', p_location_code;
  END IF;

  SELECT pr.status
    INTO v_run_status
  FROM public.production_runs pr
  WHERE pr.id = p_production_run_id
    AND pr.tenant_id = p_tenant_id
    AND pr.factory_id = p_factory_id
  FOR UPDATE;

  IF v_run_status IS NULL THEN
    RAISE EXCEPTION 'production run not found';
  END IF;

  IF v_run_status <> 'running' THEN
    RAISE EXCEPTION 'production run status % is not running', v_run_status;
  END IF;

  v_bag_code := 'BAG-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.production_bags (
    tenant_id, factory_id, production_run_id, material_id,
    weight_kg, remaining_kg, location_id, created_by, status, bag_code
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, p_material_id,
    p_weight_kg, p_weight_kg, v_location_id, COALESCE(p_created_by, v_user_id), 'stored', v_bag_code
  ) RETURNING id INTO v_bag_id;

  UPDATE public.production_runs
    SET actual_output_kg = actual_output_kg + p_weight_kg,
        updated_at = now()
  WHERE id = p_production_run_id
  RETURNING actual_output_kg INTO v_output_kg;

  SELECT ps.id
    INTO v_proj_summary_id
  FROM public.projection_production_summary ps
  WHERE ps.tenant_id = p_tenant_id
    AND ps.factory_id = p_factory_id
    AND ps.production_run_id = p_production_run_id
  FOR UPDATE;

  SELECT COALESCE(SUM(mc.consumed_kg), 0)
    INTO v_consumed_kg
  FROM public.material_consumption mc
  WHERE mc.tenant_id = p_tenant_id
    AND mc.factory_id = p_factory_id
    AND mc.production_run_id = p_production_run_id;

  v_new_yield := CASE WHEN v_consumed_kg > 0 THEN v_output_kg / v_consumed_kg ELSE 0 END;

  IF v_proj_summary_id IS NULL THEN
    INSERT INTO public.projection_production_summary (
      tenant_id, factory_id, production_run_id, output_kg, scrap_kg, yield_ratio, updated_at
    ) VALUES (
      p_tenant_id, p_factory_id, p_production_run_id, v_output_kg, 0, v_new_yield, now()
    ) RETURNING id INTO v_proj_summary_id;
  ELSE
    UPDATE public.projection_production_summary
      SET output_kg = v_output_kg,
          yield_ratio = v_new_yield,
          updated_at = now()
    WHERE id = v_proj_summary_id;
  END IF;

  SELECT sb.id, sb.quantity_kg
    INTO v_balance_id, v_balance_qty
  FROM public.stock_balances sb
  WHERE sb.tenant_id = p_tenant_id
    AND sb.factory_id = p_factory_id
    AND sb.location_id = v_location_id
    AND sb.material_id = p_material_id
  FOR UPDATE;

  IF v_balance_id IS NULL THEN
    v_balance_qty := p_weight_kg;
    INSERT INTO public.stock_balances (
      tenant_id, factory_id, location_id, material_id, quantity_kg, updated_by
    ) VALUES (
      p_tenant_id, p_factory_id, v_location_id, p_material_id, v_balance_qty, COALESCE(p_created_by, v_user_id)
    ) RETURNING id INTO v_balance_id;
  ELSE
    v_balance_qty := v_balance_qty + p_weight_kg;
    UPDATE public.stock_balances
      SET quantity_kg = v_balance_qty,
          updated_by = COALESCE(p_created_by, v_user_id),
          updated_at = now()
    WHERE id = v_balance_id;
  END IF;

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
    v_proj_qty := v_proj_qty + p_weight_kg;
    UPDATE public.projection_stock_balances
      SET quantity_kg = v_proj_qty,
          last_event_id = v_event_id,
          updated_at = now()
    WHERE id = v_proj_id;
  END IF;

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, batch_id,
    movement_type, quantity_kg, to_location_id,
    reference_id, reference_type, created_by, notes, created_at
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, NULL,
    'bag_produced', p_weight_kg, v_location_id,
    v_bag_id, 'production_bag', COALESCE(p_created_by, v_user_id), 'Produced bag registered', now()
  );

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'BagProduced',
    'production_bag',
    v_bag_id,
    jsonb_build_object(
      'production_run_id', p_production_run_id,
      'material_id', p_material_id,
      'weight_kg', p_weight_kg,
      'location_id', v_location_id,
      'bag_code', v_bag_code
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'production_bag', jsonb_build_object(
      'id', v_bag_id,
      'bag_code', v_bag_code,
      'weight_kg', p_weight_kg,
      'remaining_kg', p_weight_kg,
      'location_id', v_location_id,
      'material_id', p_material_id
    ),
    'production_run', jsonb_build_object(
      'id', p_production_run_id,
      'actual_output_kg', v_output_kg
    ),
    'projection_production_summary', jsonb_build_object(
      'id', v_proj_summary_id,
      'output_kg', v_output_kg,
      'yield_ratio', v_new_yield
    ),
    'projection_stock_balance', jsonb_build_object(
      'id', v_proj_id,
      'quantity_kg', v_proj_qty,
      'last_event_id', v_event_id
    ),
    'event_id', v_event_id
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.fn_consume_material(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_material_id uuid,
  p_consumed_kg numeric,
  p_batch_id uuid DEFAULT NULL,
  p_consumption_location_code text DEFAULT 'PMP',
  p_consumed_at timestamptz DEFAULT now(),
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_event_id uuid := gen_random_uuid();
  v_consumption_id uuid;
  v_location_id uuid;
  v_run_status text;
  v_balance_id uuid;
  v_balance_qty numeric;
  v_proj_id uuid;
  v_proj_qty numeric;
  v_output_kg numeric;
  v_consumed_total numeric;
  v_yield numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_production_run_id IS NULL OR p_material_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id, production_run_id and material_id are required';
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

  IF p_consumed_kg IS NULL OR p_consumed_kg <= 0 THEN
    RAISE EXCEPTION 'consumed_kg must be > 0';
  END IF;

  SELECT id INTO v_location_id
  FROM public.stock_locations
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND upper(code) = upper(p_consumption_location_code)
    AND is_active = true
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'location % not found/active', p_consumption_location_code;
  END IF;

  SELECT pr.status, pr.actual_output_kg
    INTO v_run_status, v_output_kg
  FROM public.production_runs pr
  WHERE pr.id = p_production_run_id
    AND pr.tenant_id = p_tenant_id
    AND pr.factory_id = p_factory_id
  FOR UPDATE;

  IF v_run_status IS NULL THEN
    RAISE EXCEPTION 'production run not found';
  END IF;

  IF v_run_status <> 'running' THEN
    RAISE EXCEPTION 'production run status % is not running', v_run_status;
  END IF;

  IF p_batch_id IS NOT NULL THEN
    UPDATE public.material_batches mb
      SET remaining_kg = mb.remaining_kg - p_consumed_kg,
          updated_at = now()
    WHERE mb.id = p_batch_id
      AND mb.tenant_id = p_tenant_id
      AND mb.factory_id = p_factory_id
      AND mb.material_id = p_material_id
      AND mb.remaining_kg >= p_consumed_kg;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient batch remaining for provided batch/material';
    END IF;
  END IF;

  SELECT sb.id, sb.quantity_kg
    INTO v_balance_id, v_balance_qty
  FROM public.stock_balances sb
  WHERE sb.tenant_id = p_tenant_id
    AND sb.factory_id = p_factory_id
    AND sb.location_id = v_location_id
    AND sb.material_id = p_material_id
  FOR UPDATE;

  IF v_balance_id IS NULL OR v_balance_qty < p_consumed_kg THEN
    RAISE EXCEPTION 'insufficient stock at location for material consumption';
  END IF;

  v_balance_qty := v_balance_qty - p_consumed_kg;
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
    v_proj_qty := v_proj_qty - p_consumed_kg;
    UPDATE public.projection_stock_balances
      SET quantity_kg = v_proj_qty,
          last_event_id = v_event_id,
          updated_at = now()
    WHERE id = v_proj_id;
  END IF;

  INSERT INTO public.material_consumption (
    tenant_id, factory_id, production_run_id, material_id, batch_id,
    consumed_kg, consumed_at, created_by
  ) VALUES (
    p_tenant_id, p_factory_id, p_production_run_id, p_material_id, p_batch_id,
    p_consumed_kg, COALESCE(p_consumed_at, now()), COALESCE(p_created_by, v_user_id)
  ) RETURNING id INTO v_consumption_id;

  INSERT INTO public.stock_movements (
    tenant_id, factory_id, material_id, batch_id,
    movement_type, quantity_kg, from_location_id,
    reference_id, reference_type, created_by, notes, created_at
  ) VALUES (
    p_tenant_id, p_factory_id, p_material_id, p_batch_id,
    'material_consumed', -p_consumed_kg, v_location_id,
    v_consumption_id, 'material_consumption', COALESCE(p_created_by, v_user_id), 'Material consumed during production', now()
  );

  SELECT COALESCE(SUM(mc.consumed_kg), 0)
    INTO v_consumed_total
  FROM public.material_consumption mc
  WHERE mc.tenant_id = p_tenant_id
    AND mc.factory_id = p_factory_id
    AND mc.production_run_id = p_production_run_id;

  v_yield := CASE WHEN v_consumed_total > 0 THEN v_output_kg / v_consumed_total ELSE 0 END;

  UPDATE public.projection_production_summary
    SET yield_ratio = v_yield,
        updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND production_run_id = p_production_run_id;

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'MaterialConsumed',
    'material_consumption',
    v_consumption_id,
    jsonb_build_object(
      'production_run_id', p_production_run_id,
      'material_id', p_material_id,
      'batch_id', p_batch_id,
      'consumed_kg', p_consumed_kg,
      'location_id', v_location_id,
      'consumed_at', COALESCE(p_consumed_at, now())
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'material_consumption', jsonb_build_object(
      'id', v_consumption_id,
      'production_run_id', p_production_run_id,
      'material_id', p_material_id,
      'batch_id', p_batch_id,
      'consumed_kg', p_consumed_kg
    ),
    'stock_balance', jsonb_build_object(
      'id', v_balance_id,
      'quantity_kg', v_balance_qty
    ),
    'projection_stock_balance', jsonb_build_object(
      'id', v_proj_id,
      'quantity_kg', v_proj_qty,
      'last_event_id', v_event_id
    ),
    'yield_ratio', v_yield,
    'event_id', v_event_id
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.fn_calculate_yield(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_event_id uuid := gen_random_uuid();
  v_output_kg numeric;
  v_consumed_kg numeric;
  v_yield numeric;
  v_metric_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_production_run_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id and production_run_id are required';
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

  SELECT pr.actual_output_kg
    INTO v_output_kg
  FROM public.production_runs pr
  WHERE pr.id = p_production_run_id
    AND pr.tenant_id = p_tenant_id
    AND pr.factory_id = p_factory_id
  FOR UPDATE;

  IF v_output_kg IS NULL THEN
    RAISE EXCEPTION 'production run not found';
  END IF;

  SELECT COALESCE(SUM(mc.consumed_kg), 0)
    INTO v_consumed_kg
  FROM public.material_consumption mc
  WHERE mc.tenant_id = p_tenant_id
    AND mc.factory_id = p_factory_id
    AND mc.production_run_id = p_production_run_id;

  v_yield := CASE WHEN v_consumed_kg > 0 THEN v_output_kg / v_consumed_kg ELSE 0 END;

  SELECT pym.id
    INTO v_metric_id
  FROM public.production_yield_metrics pym
  WHERE pym.tenant_id = p_tenant_id
    AND pym.factory_id = p_factory_id
    AND pym.production_run_id = p_production_run_id
  FOR UPDATE;

  IF v_metric_id IS NULL THEN
    INSERT INTO public.production_yield_metrics (
      tenant_id, factory_id, production_run_id,
      produced_output_kg, consumed_material_kg, yield_ratio, created_at
    ) VALUES (
      p_tenant_id, p_factory_id, p_production_run_id,
      v_output_kg, v_consumed_kg, v_yield, now()
    ) RETURNING id INTO v_metric_id;
  ELSE
    UPDATE public.production_yield_metrics
      SET produced_output_kg = v_output_kg,
          consumed_material_kg = v_consumed_kg,
          yield_ratio = v_yield
    WHERE id = v_metric_id;
  END IF;

  UPDATE public.projection_production_summary
    SET output_kg = v_output_kg,
        yield_ratio = v_yield,
        updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND factory_id = p_factory_id
    AND production_run_id = p_production_run_id;

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'YieldCalculated',
    'production_run',
    p_production_run_id,
    jsonb_build_object(
      'produced_output_kg', v_output_kg,
      'consumed_material_kg', v_consumed_kg,
      'yield_ratio', v_yield
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'yield_metric', jsonb_build_object(
      'id', v_metric_id,
      'production_run_id', p_production_run_id,
      'produced_output_kg', v_output_kg,
      'consumed_material_kg', v_consumed_kg,
      'yield_ratio', v_yield
    ),
    'event_id', v_event_id
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.fn_calculate_oee(
  p_tenant_id uuid,
  p_factory_id uuid,
  p_production_run_id uuid,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_event_id uuid := gen_random_uuid();
  v_metric_id uuid;
  v_proj_id uuid;
  v_machine_id uuid;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_status text;
  v_planned numeric;
  v_actual numeric;
  v_scrap numeric;
  v_availability numeric;
  v_performance numeric;
  v_quality numeric;
  v_oee numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_tenant_id IS NULL OR p_factory_id IS NULL OR p_production_run_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id, factory_id and production_run_id are required';
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

  SELECT pr.machine_id, pr.started_at, pr.ended_at, pr.status, pr.planned_output_kg, pr.actual_output_kg, pr.scrap_kg
    INTO v_machine_id, v_started_at, v_ended_at, v_status, v_planned, v_actual, v_scrap
  FROM public.production_runs pr
  WHERE pr.id = p_production_run_id
    AND pr.tenant_id = p_tenant_id
    AND pr.factory_id = p_factory_id
  FOR UPDATE;

  IF v_machine_id IS NULL THEN
    RAISE EXCEPTION 'production run not found or machine not set';
  END IF;

  v_availability := CASE WHEN v_started_at IS NOT NULL THEN 1 ELSE 0 END;
  v_performance := CASE WHEN COALESCE(v_planned, 0) > 0 THEN GREATEST(v_actual / v_planned, 0) ELSE 0 END;
  v_quality := CASE WHEN COALESCE(v_actual, 0) > 0 THEN GREATEST((v_actual - COALESCE(v_scrap, 0)) / v_actual, 0) ELSE 0 END;
  v_oee := v_availability * v_performance * v_quality;

  SELECT mom.id
    INTO v_metric_id
  FROM public.machine_oee_metrics mom
  WHERE mom.tenant_id = p_tenant_id
    AND mom.factory_id = p_factory_id
    AND mom.production_run_id = p_production_run_id
  FOR UPDATE;

  IF v_metric_id IS NULL THEN
    INSERT INTO public.machine_oee_metrics (
      tenant_id, factory_id, machine_id, production_run_id,
      availability, performance, quality, oee, measured_at
    ) VALUES (
      p_tenant_id, p_factory_id, v_machine_id, p_production_run_id,
      v_availability, v_performance, v_quality, v_oee, now()
    ) RETURNING id INTO v_metric_id;
  ELSE
    UPDATE public.machine_oee_metrics
      SET availability = v_availability,
          performance = v_performance,
          quality = v_quality,
          oee = v_oee,
          measured_at = now()
    WHERE id = v_metric_id;
  END IF;

  SELECT pmm.id
    INTO v_proj_id
  FROM public.projection_machine_metrics pmm
  WHERE pmm.tenant_id = p_tenant_id
    AND pmm.factory_id = p_factory_id
    AND pmm.machine_id = v_machine_id
  FOR UPDATE;

  IF v_proj_id IS NULL THEN
    INSERT INTO public.projection_machine_metrics (
      tenant_id, factory_id, machine_id,
      availability, performance, quality, oee, updated_at
    ) VALUES (
      p_tenant_id, p_factory_id, v_machine_id,
      v_availability, v_performance, v_quality, v_oee, now()
    ) RETURNING id INTO v_proj_id;
  ELSE
    UPDATE public.projection_machine_metrics
      SET availability = v_availability,
          performance = v_performance,
          quality = v_quality,
          oee = v_oee,
          updated_at = now()
    WHERE id = v_proj_id;
  END IF;

  INSERT INTO public.events (
    id, tenant_id, factory_id, event_type, aggregate_type, aggregate_id, payload, created_by, created_at
  ) VALUES (
    v_event_id,
    p_tenant_id,
    p_factory_id,
    'OEECalculated',
    'machine',
    v_machine_id,
    jsonb_build_object(
      'production_run_id', p_production_run_id,
      'machine_id', v_machine_id,
      'availability', v_availability,
      'performance', v_performance,
      'quality', v_quality,
      'oee', v_oee,
      'run_status', v_status,
      'started_at', v_started_at,
      'ended_at', v_ended_at
    ),
    COALESCE(p_created_by, v_user_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'machine_oee_metric', jsonb_build_object(
      'id', v_metric_id,
      'machine_id', v_machine_id,
      'production_run_id', p_production_run_id,
      'availability', v_availability,
      'performance', v_performance,
      'quality', v_quality,
      'oee', v_oee
    ),
    'projection_machine_metric', jsonb_build_object(
      'id', v_proj_id,
      'machine_id', v_machine_id,
      'availability', v_availability,
      'performance', v_performance,
      'quality', v_quality,
      'oee', v_oee
    ),
    'event_id', v_event_id
  );
END;
$function$;