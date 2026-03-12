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
      from_location_code,
      to_location_code,
      items,
      notes = null,
    } = body ?? {};

    if (!tenant_id || !factory_id || !from_location_code || !to_location_code) {
      return json(400, { success: false, error: 'tenant_id, factory_id, from_location_code and to_location_code are required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return json(400, { success: false, error: 'items must be a non-empty array' });
    }

    const sanitizedItems = items.map((item) => ({
      material_id: item?.material_id,
      batch_id: item?.batch_id ?? null,
      requested_kg: Number(item?.requested_kg),
    }));

    if (sanitizedItems.some((item) => !item.material_id || !Number.isFinite(item.requested_kg) || item.requested_kg <= 0)) {
      return json(400, { success: false, error: 'each item must have material_id and requested_kg > 0' });
    }

    const { data, error } = await supabase.rpc('fn_create_transfer_request', {
      p_tenant_id: tenant_id,
      p_factory_id: factory_id,
      p_from_location_code: String(from_location_code).trim().toUpperCase(),
      p_to_location_code: String(to_location_code).trim().toUpperCase(),
      p_items: sanitizedItems,
      p_notes: notes,
      p_requested_by: userId,
    });

    if (error) return json(400, { success: false, error: error.message });
    return json(200, data ?? { success: true });
  } catch (err) {
    return json(500, { success: false, error: err instanceof Error ? err.message : 'Unexpected error' });
  }
});
