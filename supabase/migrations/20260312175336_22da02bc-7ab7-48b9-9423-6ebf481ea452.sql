-- Harden tenant resolver to avoid NULL-comparison bypass
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT ut.tenant_id
      FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
      ORDER BY ut.created_at DESC NULLS LAST
      LIMIT 1
    ),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$;

-- Enforce factory_id not null in events when data is clean
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE factory_id IS NULL) THEN
    ALTER TABLE public.events ALTER COLUMN factory_id SET NOT NULL;
  END IF;
END$$;

-- Minimal operational fixtures for end-to-end validation
INSERT INTO public.materials (id, tenant_id, factory_id, material_code, material_name, unit)
VALUES (
  '13000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'COMP-001',
  'Composto Base 001',
  'KG'
)
ON CONFLICT (id) DO UPDATE
SET material_code = excluded.material_code,
    material_name = excluded.material_name,
    unit = excluded.unit;

INSERT INTO public.production_orders (
  id, tenant_id, factory_id, order_code, product_name, planned_output_kg, status, created_by
)
VALUES (
  '14000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'OP-0001',
  'Composto Base 001',
  1000,
  'PLANNED',
  '4baa5491-c8d6-4886-a75d-0cce31e7ac59'
)
ON CONFLICT (id) DO UPDATE
SET order_code = excluded.order_code,
    product_name = excluded.product_name,
    planned_output_kg = excluded.planned_output_kg,
    status = excluded.status;