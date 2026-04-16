import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.userId) {
    return session.user.userId;
  }
  // Fallback for unauthenticated/dev mode
  return 'USR-001';
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user;
}
