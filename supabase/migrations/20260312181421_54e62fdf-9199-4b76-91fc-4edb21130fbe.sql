-- 1) Core table for atomic code counters
CREATE TABLE IF NOT EXISTS public.code_sequences (
  entity_key text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.code_sequences ENABLE ROW LEVEL SECURITY;

-- 2) Missing code columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.transfer_requests ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.production_bags ADD COLUMN IF NOT EXISTS code text;

-- 3) separation_orders table
CREATE TABLE IF NOT EXISTS public.separation_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  factory_id uuid NOT NULL,
  transfer_request_id uuid NULL,
  code text,
  status text NOT NULL DEFAULT 'OPEN',
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.separation_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'separation_orders_transfer_request_id_fkey'
      AND conrelid = 'public.separation_orders'::regclass
  ) THEN
    ALTER TABLE public.separation_orders
      ADD CONSTRAINT separation_orders_transfer_request_id_fkey
      FOREIGN KEY (transfer_request_id) REFERENCES public.transfer_requests(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='separation_orders' AND policyname='separation_orders_select_scope') THEN
    CREATE POLICY separation_orders_select_scope ON public.separation_orders FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id()) AND public.can_access_factory(factory_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='separation_orders' AND policyname='separation_orders_insert_scope') THEN
    CREATE POLICY separation_orders_insert_scope ON public.separation_orders FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id()) AND public.can_access_factory(factory_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='separation_orders' AND policyname='separation_orders_update_scope') THEN
    CREATE POLICY separation_orders_update_scope ON public.separation_orders FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id()) AND public.can_access_factory(factory_id))
    WITH CHECK ((tenant_id = public.current_tenant_id()) AND public.can_access_factory(factory_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='separation_orders' AND policyname='separation_orders_delete_scope') THEN
    CREATE POLICY separation_orders_delete_scope ON public.separation_orders FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id()) AND public.can_access_factory(factory_id));
  END IF;
END $$;

-- 4) Concurrency-safe generator
CREATE OR REPLACE FUNCTION public.next_standard_code(p_entity text, p_prefix text, p_pad int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO public.code_sequences (entity_key, last_value, updated_at)
  VALUES (p_entity, 1, now())
  ON CONFLICT (entity_key)
  DO UPDATE SET last_value = public.code_sequences.last_value + 1, updated_at = now()
  RETURNING last_value INTO v_next;

  RETURN upper(trim(p_prefix)) || '-' || lpad(v_next::text, GREATEST(p_pad, 1), '0');
END;
$$;

-- 5) Assign-code trigger functions
CREATE OR REPLACE FUNCTION public.assign_material_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.material_code := public.next_standard_code('materials', 'MAT', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_machine_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.machine_code := public.next_standard_code('machines', 'MCH', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_user_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.code := public.next_standard_code('users', 'USR', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_order_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.order_code := public.next_standard_code('production_orders', 'OP', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_transfer_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.code := public.next_standard_code('transfer_requests', 'TRF', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_separation_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.code := public.next_standard_code('separation_orders', 'SEP', 4);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_bag_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.code := public.next_standard_code('production_bags', 'BAG', 6);
  RETURN NEW;
END; $$;

-- 6) Attach insert triggers
DROP TRIGGER IF EXISTS trg_assign_material_code ON public.materials;
CREATE TRIGGER trg_assign_material_code BEFORE INSERT ON public.materials FOR EACH ROW EXECUTE FUNCTION public.assign_material_code();

DROP TRIGGER IF EXISTS trg_assign_machine_code ON public.machines;
CREATE TRIGGER trg_assign_machine_code BEFORE INSERT ON public.machines FOR EACH ROW EXECUTE FUNCTION public.assign_machine_code();

DROP TRIGGER IF EXISTS trg_assign_user_code ON public.users;
CREATE TRIGGER trg_assign_user_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.assign_user_code();

DROP TRIGGER IF EXISTS trg_assign_order_code ON public.production_orders;
CREATE TRIGGER trg_assign_order_code BEFORE INSERT ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_code();

DROP TRIGGER IF EXISTS trg_assign_transfer_code ON public.transfer_requests;
CREATE TRIGGER trg_assign_transfer_code BEFORE INSERT ON public.transfer_requests FOR EACH ROW EXECUTE FUNCTION public.assign_transfer_code();

DROP TRIGGER IF EXISTS trg_assign_separation_code ON public.separation_orders;
CREATE TRIGGER trg_assign_separation_code BEFORE INSERT ON public.separation_orders FOR EACH ROW EXECUTE FUNCTION public.assign_separation_code();

DROP TRIGGER IF EXISTS trg_assign_bag_code ON public.production_bags;
CREATE TRIGGER trg_assign_bag_code BEFORE INSERT ON public.production_bags FOR EACH ROW EXECUTE FUNCTION public.assign_bag_code();

-- 7) Initialize counters from existing valid codes
INSERT INTO public.code_sequences (entity_key, last_value, updated_at)
VALUES
('materials', COALESCE((SELECT max((regexp_match(material_code, '^MAT-(\\d+)$'))[1]::bigint) FROM public.materials), 0), now()),
('machines', COALESCE((SELECT max((regexp_match(machine_code, '^MCH-(\\d+)$'))[1]::bigint) FROM public.machines), 0), now()),
('users', COALESCE((SELECT max((regexp_match(code, '^USR-(\\d+)$'))[1]::bigint) FROM public.users), 0), now()),
('production_orders', COALESCE((SELECT max((regexp_match(order_code, '^OP-(\\d+)$'))[1]::bigint) FROM public.production_orders), 0), now()),
('transfer_requests', COALESCE((SELECT max((regexp_match(code, '^TRF-(\\d+)$'))[1]::bigint) FROM public.transfer_requests), 0), now()),
('separation_orders', COALESCE((SELECT max((regexp_match(code, '^SEP-(\\d+)$'))[1]::bigint) FROM public.separation_orders), 0), now()),
('production_bags', COALESCE((SELECT max((regexp_match(code, '^BAG-(\\d+)$'))[1]::bigint) FROM public.production_bags), 0), now())
ON CONFLICT (entity_key)
DO UPDATE SET last_value = GREATEST(public.code_sequences.last_value, EXCLUDED.last_value), updated_at = now();

-- 8) Backfill missing/non-standard/duplicate codes in deterministic order
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN SELECT id FROM public.materials WHERE material_code IS NULL OR material_code !~ '^MAT-\\d{4}$' ORDER BY created_at, id LOOP
    UPDATE public.materials SET material_code = public.next_standard_code('materials','MAT',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY material_code ORDER BY created_at, id) rn FROM public.materials WHERE material_code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.materials SET material_code = public.next_standard_code('materials','MAT',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.machines WHERE machine_code IS NULL OR machine_code !~ '^MCH-\\d{4}$' ORDER BY created_at, id LOOP
    UPDATE public.machines SET machine_code = public.next_standard_code('machines','MCH',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY machine_code ORDER BY created_at, id) rn FROM public.machines WHERE machine_code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.machines SET machine_code = public.next_standard_code('machines','MCH',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.users WHERE code IS NULL OR code !~ '^USR-\\d{4}$' ORDER BY created_at NULLS LAST, id LOOP
    UPDATE public.users SET code = public.next_standard_code('users','USR',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY code ORDER BY created_at NULLS LAST, id) rn FROM public.users WHERE code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.users SET code = public.next_standard_code('users','USR',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.production_orders WHERE order_code IS NULL OR order_code !~ '^OP-\\d{4}$' ORDER BY created_at, id LOOP
    UPDATE public.production_orders SET order_code = public.next_standard_code('production_orders','OP',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY order_code ORDER BY created_at, id) rn FROM public.production_orders WHERE order_code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.production_orders SET order_code = public.next_standard_code('production_orders','OP',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.transfer_requests WHERE code IS NULL OR code !~ '^TRF-\\d{4}$' ORDER BY requested_at, id LOOP
    UPDATE public.transfer_requests SET code = public.next_standard_code('transfer_requests','TRF',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY code ORDER BY requested_at, id) rn FROM public.transfer_requests WHERE code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.transfer_requests SET code = public.next_standard_code('transfer_requests','TRF',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.separation_orders WHERE code IS NULL OR code !~ '^SEP-\\d{4}$' ORDER BY created_at, id LOOP
    UPDATE public.separation_orders SET code = public.next_standard_code('separation_orders','SEP',4) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY code ORDER BY created_at, id) rn FROM public.separation_orders WHERE code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.separation_orders SET code = public.next_standard_code('separation_orders','SEP',4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.production_bags WHERE code IS NULL OR code !~ '^BAG-\\d{6}$' ORDER BY created_at, id LOOP
    UPDATE public.production_bags SET code = public.next_standard_code('production_bags','BAG',6) WHERE id = rec.id;
  END LOOP;
  FOR rec IN SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY code ORDER BY created_at, id) rn FROM public.production_bags WHERE code IS NOT NULL) t WHERE t.rn > 1 LOOP
    UPDATE public.production_bags SET code = public.next_standard_code('production_bags','BAG',6) WHERE id = rec.id;
  END LOOP;
END $$;

-- 9) Required + unique
ALTER TABLE public.users ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.transfer_requests ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.production_bags ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.separation_orders ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_materials_material_code ON public.materials(material_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_machines_machine_code ON public.machines(machine_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_code ON public.users(code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_production_orders_order_code ON public.production_orders(order_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transfer_requests_code ON public.transfer_requests(code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_separation_orders_code ON public.separation_orders(code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_production_bags_code ON public.production_bags(code);

-- 10) Prevent manual code updates (after backfill)
CREATE OR REPLACE FUNCTION public.prevent_code_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_ARGV[0] = 'material_code' AND NEW.material_code IS DISTINCT FROM OLD.material_code THEN
    RAISE EXCEPTION 'material_code cannot be updated';
  ELSIF TG_ARGV[0] = 'machine_code' AND NEW.machine_code IS DISTINCT FROM OLD.machine_code THEN
    RAISE EXCEPTION 'machine_code cannot be updated';
  ELSIF TG_ARGV[0] = 'order_code' AND NEW.order_code IS DISTINCT FROM OLD.order_code THEN
    RAISE EXCEPTION 'order_code cannot be updated';
  ELSIF TG_ARGV[0] = 'code' AND NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'code cannot be updated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_material_code_update ON public.materials;
CREATE TRIGGER trg_prevent_material_code_update BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('material_code');

DROP TRIGGER IF EXISTS trg_prevent_machine_code_update ON public.machines;
CREATE TRIGGER trg_prevent_machine_code_update BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('machine_code');

DROP TRIGGER IF EXISTS trg_prevent_order_code_update ON public.production_orders;
CREATE TRIGGER trg_prevent_order_code_update BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('order_code');

DROP TRIGGER IF EXISTS trg_prevent_users_code_update ON public.users;
CREATE TRIGGER trg_prevent_users_code_update BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('code');

DROP TRIGGER IF EXISTS trg_prevent_transfer_code_update ON public.transfer_requests;
CREATE TRIGGER trg_prevent_transfer_code_update BEFORE UPDATE ON public.transfer_requests FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('code');

DROP TRIGGER IF EXISTS trg_prevent_separation_code_update ON public.separation_orders;
CREATE TRIGGER trg_prevent_separation_code_update BEFORE UPDATE ON public.separation_orders FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('code');

DROP TRIGGER IF EXISTS trg_prevent_bag_code_update ON public.production_bags;
CREATE TRIGGER trg_prevent_bag_code_update BEFORE UPDATE ON public.production_bags FOR EACH ROW EXECUTE FUNCTION public.prevent_code_update('code');

-- 11) updated_at for separation orders
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_separation_orders_touch_updated_at ON public.separation_orders;
CREATE TRIGGER trg_separation_orders_touch_updated_at
BEFORE UPDATE ON public.separation_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();