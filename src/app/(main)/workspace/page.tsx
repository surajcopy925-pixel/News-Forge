'use client';

import { User, Mail, Phone, Shield, Bell, Lock, Save } from 'lucide-react';
import { ThemePicker } from '@/components/ThemePicker';

export default function WorkspacePage() {

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

        {/* Theme */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
            <h2 className="text-sm font-semibold text-zinc-200">Theme</h2>
          </div>
          <ThemePicker />
        </section>

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
