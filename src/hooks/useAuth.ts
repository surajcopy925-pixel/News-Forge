'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    userId: session?.user?.userId ?? null,
    role: session?.user?.role ?? null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    signIn: (email: string, password: string) =>
      signIn('credentials', { email, password, redirect: false }),
    signOut: () => signOut({ callbackUrl: '/login' }),
  };
}
