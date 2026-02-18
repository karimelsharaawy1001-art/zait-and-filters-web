'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

async function getServerSupabase() {
  const cookieStore = await cookies(); // await here

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );
}

export async function setUserRole(userId: string, role: 'user' | 'admin') {
  const supabase = await getServerSupabase();

  // 1) check caller is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // 2) check caller is admin
  const { data: callerRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (callerRole?.role !== 'admin') {
    throw new Error('Not authorized');
  }

  // 3) upsert target user role
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

  if (error) {
    console.error('setUserRole error', error);
    throw new Error('Failed to update role');
  }

  return { ok: true };
}
