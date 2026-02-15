import { createClient } from '@supabase/supabase-js'

// ده الرابط اللي جاب Ping معاك بنجاح
const supabaseUrl = 'https://dcaecjzsmitzuagjlyll.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanpzbWl0enVhZ2pseWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg2MzUsImV4cCI6MjA4NjQ3NDYzNX0.UhXXRtxAaUcqSAD2wZQZGYMi0y-vBgXFRQCuxMBKMmk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)