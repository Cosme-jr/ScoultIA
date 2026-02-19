import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function checkSchema() {
  console.log('--- Table: profissionais ---');
  // Attempt to select columns from information_schema
  const { data, error } = await supabase.rpc('inspect_table', { table_name: 'profissionais' });
  
  if (error) {
    console.log('RPC inspect_table failed, trying fallback...');
    const { data: cols, error: cErr } = await supabase
      .from('profissionais')
      .select('*')
      .limit(1);
    
    if (cols && cols[0]) {
      console.log('Detected Columns:', Object.keys(cols[0]));
      console.log('Values:', cols[0]);
    } else {
      console.error('Could not even select one record:', cErr?.message);
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
