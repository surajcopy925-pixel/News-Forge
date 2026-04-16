'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';

export default function UserMenu() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const roleColors: Record<string, string> = {
    PRODUCER: 'text-purple-400',
    EDITOR: 'text-blue-400',
    COPY_EDITOR: 'text-green-400',
    REPORTER: 'text-yellow-400',
    ADMIN: 'text-red-400',
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <User className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-300">{user.fullName}</span>
        <span className={`${roleColors[user.role] || 'text-gray-400'} font-medium`}>
          {user.role.replace('_', ' ')}
        </span>
      </div>
      <button
        onClick={() => signOut()}
        className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
