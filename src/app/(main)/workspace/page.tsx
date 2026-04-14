'use client';

import { useState } from 'react';
import { User, Mail, Phone, Shield, Palette, Bell, Lock, Save } from 'lucide-react';

const themes = [
  { id: 'dark-pro', name: 'Dark Professional', desc: 'Default dark theme', color: '#0B1120' },
  { id: 'light', name: 'Light Clean', desc: 'Light theme for offices', color: '#F8FAFC' },
  { id: 'dark-hc', name: 'Dark High-Contrast', desc: 'Accessibility focused', color: '#000000' },
  { id: 'light-warm', name: 'Light Warm', desc: 'Reduced eye strain', color: '#FFFBF0' },
];

export default function WorkspacePage() {
  const [selectedTheme, setSelectedTheme] = useState('dark-pro');

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <h1 className="text-lg font-bold text-gray-200">Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Personal account settings and preferences</p>

        {/* Profile Card */}
        <div className="bg-nf-surface rounded-xl border border-nf-border p-6 mt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 
                            flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-bold">PS</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-200">Priya Sharma</h2>
              <p className="text-sm text-blue-400">Senior Producer</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Member since April 2024</p>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-md transition-colors">
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <User size={11} /> Full Name
              </label>
              <input
                type="text"
                defaultValue="Priya Sharma"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <Mail size={11} /> Email
              </label>
              <input
                type="email"
                defaultValue="priya@kayaknews.com"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <Shield size={11} /> Role
              </label>
              <input
                type="text"
                value="Senior Producer"
                disabled
                className="w-full bg-nf-bg border border-nf-border rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <Phone size={11} /> Phone
              </label>
              <input
                type="text"
                placeholder="Enter phone number"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-md 
                               flex items-center gap-1.5 transition-colors">
              <Save size={12} /> Save Profile
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="bg-nf-surface rounded-xl border border-nf-border p-6 mt-4">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Lock size={14} /> Change Password
          </h3>
          <div className="space-y-3 max-w-sm">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Current Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400">New Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Confirm New Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
            </div>
            <button className="bg-nf-panel border border-nf-border text-gray-300 text-xs font-medium px-4 py-2 rounded-md 
                               hover:bg-nf-border/50 transition-colors">
              Update Password
            </button>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="bg-nf-surface rounded-xl border border-nf-border p-6 mt-4">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Palette size={14} /> Theme
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`p-3 rounded-lg border text-left transition-all
                  ${selectedTheme === theme.id
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-nf-border hover:border-nf-border-light bg-nf-bg'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded border border-nf-border" style={{ background: theme.color }} />
                  <span className="text-xs font-medium text-gray-200">{theme.name}</span>
                </div>
                <span className="text-[10px] text-gray-500">{theme.desc}</span>
                {selectedTheme === theme.id && (
                  <div className="text-[9px] text-blue-400 font-bold mt-1">✓ Active</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-nf-surface rounded-xl border border-nf-border p-6 mt-4 mb-8">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Bell size={14} /> Notifications
          </h3>
          <div className="space-y-3">
            {['Story status changes', 'Clip editing completed', 'Rundown updates', 'System alerts'].map(item => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{item}</span>
                <button className="w-9 h-5 rounded-full bg-blue-600 relative transition-colors">
                  <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-0.5 top-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
