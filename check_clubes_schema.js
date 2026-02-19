import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function checkSchema() {
  console.log('--- Table: clubes ---');
  const { data: cols, error: cErr } = await supabase
    .from('clubes')
    .select('*')
    .limit(1);
  
  if (cols && cols[0]) {
    console.log('Detected Columns:', Object.keys(cols[0]));
    console.log('Sample Record:', cols[0]);
  } else {
    console.error('Could not select from clubes:', cErr?.message);
    // If empty, let's try to see if we can get column names from somewhere else
    // But usually if it's empty, it's empty.
  }
}

checkSchema();
