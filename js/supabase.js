// js/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ ВСТАВЬ СВОИ ДАННЫЕ ИЗ SUPABASE!
const SUPABASE_URL = 'https://btnvdcvirpxfbpikqoat.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable__5O7vnaTkWTP-W0uPTEFNQ_Av-X1lB8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('✅ Supabase client created')