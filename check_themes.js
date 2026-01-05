
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xsxwzwcfaflzynsyryzq.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkThemes() {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching themes:', error);
    return;
  }
  
  console.log('Sample themes from Supabase:');
  data.forEach(theme => {
    console.log(`Theme ID: ${theme.id}, Name: ${theme.name}`);
    console.log('Keys:', Object.keys(theme));
    if (theme.mapping_config) {
      console.log('Mapping Config Keys:', Object.keys(theme.mapping_config));
      if (typeof theme.mapping_config === 'string') {
        try {
          const mc = JSON.parse(theme.mapping_config);
          console.log('Parsed Mapping Config Keys:', Object.keys(mc));
        } catch (e) {}
      }
    }
    console.log('---');
  });
}

checkThemes();
