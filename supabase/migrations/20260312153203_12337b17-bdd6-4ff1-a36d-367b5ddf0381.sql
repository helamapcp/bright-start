-- Seed base tenant/factory/admin and operational master data for MES flow
-- Idempotent by fixed UUIDs

DO $$
DECLARE
  v_tenant_id uuid := '11111111-1111-4111-8111-111111111111';
  v_factory_id uuid := '22222222-2222-4222-8222-222222222222';
  v_admin_user_id uuid := '33333333-3333-4333-8333-333333333333';
  v_cd_id uuid := '44444444-4444-4444-8444-444444444441';
  v_pcp_id uuid := '44444444-4444-4444-8444-444444444442';
  v_pmp_id uuid := '44444444-4444-4444-8444-444444444443';
  v_floor_id uuid := '44444444-4444-4444-8444-444444444444';
  v_material_id uuid := '55555555-5555-4555-8555-555555555555';
  v_machine_id uuid := '66666666-6666-4666-8666-666666666666';
  v_order_id uuid := '77777777-7777-4777-8777-777777777777';
BEGIN
  INSERT INTO public.tenants (id, tenant_name, status)
  VALUES (v_tenant_id, 'MainTenant', 'active')
  ON CONFLICT (id) DO UPDATE
    SET tenant_name = EXCLUDED.tenant_name,
        status = EXCLUDED.status,
        updated_at = now();

  INSERT INTO public.factories (id, tenant_id, factory_name, location, timezone, status)
  VALUES (v_factory_id, v_tenant_id, 'Factory A', 'Sao Paulo - BR', 'America/Sao_Paulo', 'active')
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        factory_name = EXCLUDED.factory_name,
        location = EXCLUDED.location,
        timezone = EXCLUDED.timezone,
        status = EXCLUDED.status,
        updated_at = now();

  INSERT INTO public.profiles (id, tenant_id, default_factory_id, email, full_name)
  VALUES (v_admin_user_id, v_tenant_id, v_factory_id, 'admin@maintenant.local', 'Admin User')
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        default_factory_id = EXCLUDED.default_factory_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, tenant_id, factory_id, role)
  VALUES (v_admin_user_id, v_tenant_id, v_factory_id, 'admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.stock_locations (id, tenant_id, factory_id, code, name, location_type, is_active)
  VALUES
    (v_cd_id, v_tenant_id, v_factory_id, 'CD', 'Central de Distribuição', 'warehouse', true),
    (v_pcp_id, v_tenant_id, v_factory_id, 'PCP', 'Pré-Processo', 'warehouse', true),
    (v_pmp_id, v_tenant_id, v_factory_id, 'PMP', 'Pulmão de Máquina', 'warehouse', true),
    (v_floor_id, v_tenant_id, v_factory_id, 'FLOOR', 'Factory Floor', 'production', true)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        factory_id = EXCLUDED.factory_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        location_type = EXCLUDED.location_type,
        is_active = EXCLUDED.is_active,
        updated_at = now();

  INSERT INTO public.materials (id, tenant_id, factory_id, material_code, name, unit_type, sack_weight_kg, is_active)
  VALUES (v_material_id, v_tenant_id, v_factory_id, 'MP-001', 'Composto Base A', 'kg', 25, true)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        factory_id = EXCLUDED.factory_id,
        material_code = EXCLUDED.material_code,
        name = EXCLUDED.name,
        unit_type = EXCLUDED.unit_type,
        sack_weight_kg = EXCLUDED.sack_weight_kg,
        is_active = EXCLUDED.is_active,
        updated_at = now();

  INSERT INTO public.machines (id, tenant_id, factory_id, code, name, machine_type, status)
  VALUES (v_machine_id, v_tenant_id, v_factory_id, 'MIX-01', 'Mixer 01', 'mixer', 'available')
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        factory_id = EXCLUDED.factory_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        machine_type = EXCLUDED.machine_type,
        status = EXCLUDED.status,
        updated_at = now();

  INSERT INTO public.production_orders (
    id, tenant_id, factory_id, order_number, product_name, planned_output_kg, status, machine_id, created_by
  )
  VALUES (
    v_order_id, v_tenant_id, v_factory_id, 'OP-0001', 'Produto Piloto', 1000, 'planned', v_machine_id, v_admin_user_id
  )
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        factory_id = EXCLUDED.factory_id,
        order_number = EXCLUDED.order_number,
        product_name = EXCLUDED.product_name,
        planned_output_kg = EXCLUDED.planned_output_kg,
        status = EXCLUDED.status,
        machine_id = EXCLUDED.machine_id,
        updated_at = now();
END $$;