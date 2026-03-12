import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { success: false, error: 'Unauthorized' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { success: false, error: 'Unauthorized' });

    const userId = claimsData.claims.sub;
    const body = await req.json().catch(() => ({}));

    const {
      tenant_id,
      factory_id,
      production_order_id,
      machine_id,
      material_allocations,
      consumption_location_code = 'PMP',
      started_at = null,
    } = body ?? {};

    if (!tenant_id || !factory_id || !production_order_id || !machine_id) {
      return json(400, { success: false, error: 'tenant_id, factory_id, production_order_id and machine_id are required' });
    }

    if (!Array.isArray(material_allocations) || material_allocations.length === 0) {
      return json(400, { success: false, error: 'material_allocations must be a non-empty array' });
    }

    const sanitizedAllocations = material_allocations.map((item) => ({
      material_id: item?.material_id,
      batch_id: item?.batch_id ?? null,
      quantity_kg: Number(item?.quantity_kg),
    }));

    if (sanitizedAllocations.some((item) => !item.material_id || !Number.isFinite(item.quantity_kg) || item.quantity_kg <= 0)) {
      return json(400, { success: false, error: 'each allocation must have material_id and quantity_kg > 0' });
    }

    const { data, error } = await supabase.rpc('fn_start_production_run', {
      p_tenant_id: tenant_id,
      p_factory_id: factory_id,
      p_production_order_id: production_order_id,
      p_machine_id: machine_id,
      p_material_allocations: sanitizedAllocations,
      p_consumption_location_code: String(consumption_location_code).trim().toUpperCase(),
      p_started_at: started_at,
      p_created_by: userId,
    });

    if (error) return json(400, { success: false, error: error.message });
    return json(200, data ?? { success: true });
  } catch (err) {
    return json(500, { success: false, error: err instanceof Error ? err.message : 'Unexpected error' });
  }
});
