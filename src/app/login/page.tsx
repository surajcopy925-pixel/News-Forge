'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/rundown');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e17]">
      <div className="w-full max-w-sm bg-[#111827] rounded-lg shadow-xl p-8 border border-gray-800">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-wider">NEWSFORGE</h1>
          <p className="text-xs text-gray-400 mt-1">Broadcast News Production System</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a2233] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="user@newsforge.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a2233] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Dev hint */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-[10px] text-gray-600 text-center">
            Default: any seeded user email + &quot;newsforge123&quot;
          </p>
        </div>

        {/* Quick login buttons for dev */}
        <div className="mt-3 grid grid-cols-2 gap-1">
          {[
            { label: 'Producer', email: 'priya.sharma@newsforge.com' },
            { label: 'Editor', email: 'rahul.menon@newsforge.com' },
            { label: 'Copy Editor', email: 'kavitha.rao@newsforge.com' },
            { label: 'Reporter', email: 'deepa.nair@newsforge.com' },
          ].map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => {
                setEmail(u.email);
                setPassword('newsforge123');
              }}
              className="text-[10px] text-gray-500 hover:text-gray-300 py-1 px-2 rounded hover:bg-gray-800 transition-colors"
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
