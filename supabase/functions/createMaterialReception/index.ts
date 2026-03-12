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
      material_id,
      batch_code,
      received_kg,
      location_code = 'CD',
      supplier = null,
      received_at = null,
      metadata = {},
    } = body ?? {};

    if (!tenant_id || !factory_id || !material_id || !batch_code) {
      return json(400, { success: false, error: 'tenant_id, factory_id, material_id and batch_code are required' });
    }

    const parsedKg = Number(received_kg);
    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      return json(400, { success: false, error: 'received_kg must be a positive number' });
    }

    const { data, error } = await supabase.rpc('fn_create_material_reception', {
      p_tenant_id: tenant_id,
      p_factory_id: factory_id,
      p_material_id: material_id,
      p_batch_code: String(batch_code).trim(),
      p_received_kg: parsedKg,
      p_location_code: String(location_code || 'CD').trim().toUpperCase(),
      p_supplier: supplier,
      p_received_at: received_at,
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_created_by: userId,
    });

    if (error) return json(400, { success: false, error: error.message });
    return json(200, data ?? { success: true });
  } catch (err) {
    return json(500, { success: false, error: err instanceof Error ? err.message : 'Unexpected error' });
  }
});
