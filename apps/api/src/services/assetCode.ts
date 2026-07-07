import { supabaseAdmin } from '../lib/supabase';

export async function generateAssetCode(): Promise<string> {
  if (!supabaseAdmin) {
    // Fallback: timestamp-based
    return `JINGGA${Date.now().toString().slice(-6)}`;
  }

  const { data } = await supabaseAdmin
    .from('karya')
    .select('stellar_asset_code')
    .like('stellar_asset_code', 'JINGGA%')
    .order('stellar_asset_code', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].stellar_asset_code;
    const lastNumber = parseInt(lastCode.replace('JINGGA', ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `JINGGA${String(nextNumber).padStart(6, '0')}`;
}
