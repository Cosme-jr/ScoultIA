const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in profissionais:', Object.keys(data[0] || {}));
    console.log('Values in profissionais (Arrascaeta example):', data[0]);
  }

  const { data: viewData, error: viewError } = await supabase
    .from('v_ranking_plantel')
    .select('*')
    .limit(1);

  if (viewError) {
    console.error('View Error:', viewError);
  } else {
    console.log('Columns in v_ranking_plantel:', Object.keys(viewData[0] || {}));
  }
}

check();
