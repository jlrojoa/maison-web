import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://smnjbqjvqomopeulsuvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbmpicWp2cW9tb3BldWxzdXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njg4OTcsImV4cCI6MjA5NzA0NDg5N30.6V0YzqjhK01ElnsHJvwrmjXNgKifx3_lBgB_b0kTEiI'
)

console.log('Testing Supabase connection...\n')

const { data: products, error: pe } = await supabase.from('products').select('*')
const { data: textiles, error: te } = await supabase.from('textiles').select('*')
const { data: leads, error: le } = await supabase.from('leads').select('*')

console.log('Products table:')
if (pe) {
  console.log(`  ERROR: ${pe.message}`)
  console.log(`  Code: ${pe.code}`)
} else {
  console.log(`  OK - ${products?.length ?? 0} records`)
}

console.log('\nTextiles table:')
if (te) {
  console.log(`  ERROR: ${te.message}`)
  console.log(`  Code: ${te.code}`)
} else {
  console.log(`  OK - ${textiles?.length ?? 0} records`)
}

console.log('\nLeads table:')
if (le) {
  console.log(`  ERROR: ${le.message}`)
  console.log(`  Code: ${le.code}`)
} else {
  console.log(`  OK - ${leads?.length ?? 0} records`)
}

console.log('\n--- Summary ---')
const allTablesExist = !pe && !te && !le
if (allTablesExist) {
  console.log('STATUS: DONE - All tables exist and are ready')
} else {
  console.log('STATUS: BLOCKED - Some tables are missing')
}
