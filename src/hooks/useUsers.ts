'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api-client';

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', { role }],
    queryFn: () => usersApi.list(role),
  });
}
