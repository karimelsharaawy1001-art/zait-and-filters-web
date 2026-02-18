import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createBrowserClient(
  'https://dcaecjzsmitzuagjlyll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanpzbWl0enVhZ2pseWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg2MzUsImV4cCI6MjA4NjQ3NDYzNX0.UhXXRtxAaUcqSAD2wZQZGYMi0y-vBgXFRQCuxMBKMmk'
);
