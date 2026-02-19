import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkView() {
  // information_schema queries often require higher privileges, but let's try.
  // Alternatively, we can check if there's a RPC function.
  const { data, error } = await supabase.rpc('get_view_definition', { view_name: 'v_ranking_plantel' });
  
  if (error) {
    console.log('RPC ERROR (likely missing function):', error.message);
    // Try raw query if possible (likely to fail via REST API unless configured)
    const { data: qData, error: qError } = await supabase
      .from('v_ranking_plantel')
      .select('*')
      .limit(1);
    console.log('Record Sample:', qData ? qData[0] : 'No data');
  } else {
    console.log('View Definition:', data);
  }
}

checkView();
