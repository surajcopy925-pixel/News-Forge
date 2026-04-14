'use client';

import { useState } from 'react';
import {
  Settings, HardDrive, LayoutList, Cable, MonitorPlay,
  Users, Type, Bot, Activity, CheckCircle, AlertTriangle,
  XCircle, Save
} from 'lucide-react';

const sections = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'storage', label: 'Storage & Paths', icon: HardDrive },
  { id: 'rundown', label: 'Rundown Config', icon: LayoutList },
  { id: 'mos', label: 'MOS Connections', icon: Cable },
  { id: 'playout', label: 'Playout Engine', icon: MonitorPlay },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'fonts', label: 'Font Management', icon: Type },
  { id: 'automation', label: 'Automation', icon: Bot },
  { id: 'health', label: 'System Health', icon: Activity },
];

const healthEvents = [
  { time: '14:23:01', severity: 'warning', component: 'Storage', message: '/media/edited below 100GB threshold' },
  { time: '14:20:45', severity: 'error', component: 'MOS Viz', message: 'Connection lost to 192.168.1.51:10541' },
  { time: '14:15:00', severity: 'ok', component: 'Automation', message: 'Archived 23 rundowns older than 30 days' },
  { time: '14:10:12', severity: 'ok', component: 'Clip Watcher', message: 'Auto-linked STY-2025-00042-KN_C01' },
  { time: '14:05:00', severity: 'ok', component: 'Scheduler', message: 'Generated rundown slots for 15/04' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="flex h-full">
      {/* ═══ LEFT NAV ═══ */}
      <div className="w-56 shrink-0 bg-nf-surface border-r border-nf-border p-2 overflow-y-auto">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-colors
                ${isActive
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-l-blue-500'
                  : 'text-gray-400 hover:bg-nf-panel/50 hover:text-gray-300 border-l-2 border-l-transparent'
                }`}
            >
              <Icon size={15} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* ═══ RIGHT CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── GENERAL ── */}
        {activeSection === 'general' && (
          <div>
            <h2 className="text-lg font-bold text-gray-200">General Settings</h2>
            <p className="text-sm text-gray-500 mb-6">Basic station configuration</p>
            <div className="bg-nf-surface rounded-xl border border-nf-border p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Station Name</label>
                  <input type="text" defaultValue="News Forge - Kannada"
                    className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Station Code</label>
                  <input type="text" defaultValue="NF-KAN-01"
                    className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Default Language</label>
                  <div className="flex gap-1">
                    <button className="flex-1 py-2 text-xs font-bold rounded-md bg-nf-panel text-gray-500">English</button>
                    <button className="flex-1 py-2 text-xs font-bold rounded-md bg-blue-600 text-white">ಕನ್ನಡ</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Timezone</label>
                  <select className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50">
                    <option>Asia/Kolkata (IST +5:30)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Date Format</label>
                  <select className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Time Format</label>
                  <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input type="radio" name="timeformat" className="accent-blue-500" /> 12 hour
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input type="radio" name="timeformat" defaultChecked className="accent-blue-500" /> 24 hour
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors">
                  <Save size={12} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MOS CONNECTIONS ── */}
        {activeSection === 'mos' && (
          <div>
            <h2 className="text-lg font-bold text-gray-200">MOS Connections</h2>
            <p className="text-sm text-gray-500 mb-6">Configure MOS bridge connections to broadcast devices</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Teleprompter */}
              <div className="bg-nf-surface rounded-xl border border-nf-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-300">Teleprompter MOS</h3>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Connected
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Host IP</label>
                    <input type="text" defaultValue="192.168.1.50" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Port</label>
                    <input type="text" defaultValue="10540" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">MOS ID</label>
                    <input type="text" defaultValue="PROMPTER.MOS" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Heartbeat (sec)</label>
                    <input type="number" defaultValue="10" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <button className="w-full bg-nf-panel border border-nf-border text-gray-300 text-xs font-medium py-2 rounded-md hover:bg-nf-border/50 transition-colors">
                    Test Connection
                  </button>
                  <div className="text-[10px] text-gray-500">Last heartbeat: 2 seconds ago</div>
                </div>
              </div>

              {/* Viz Director */}
              <div className="bg-nf-surface rounded-xl border border-nf-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-300">Viz Director MOS</h3>
                  <span className="flex items-center gap-1.5 text-xs text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Disconnected
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Host IP</label>
                    <input type="text" defaultValue="192.168.1.51" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Port</label>
                    <input type="text" defaultValue="10541" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">MOS ID</label>
                    <input type="text" defaultValue="VIZRT.MOS" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-400">Heartbeat (sec)</label>
                    <input type="number" defaultValue="10" className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <button className="w-full bg-nf-panel border border-nf-border text-gray-300 text-xs font-medium py-2 rounded-md hover:bg-nf-border/50 transition-colors">
                    Test Connection
                  </button>
                  <div className="text-[10px] text-red-400">Last seen: 15 min ago</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM HEALTH ── */}
        {activeSection === 'health' && (
          <div>
            <h2 className="text-lg font-bold text-gray-200">System Health</h2>
            <p className="text-sm text-gray-500 mb-6">Real-time system monitoring</p>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-nf-surface rounded-xl border border-nf-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Database — Healthy</span>
                </div>
                <div className="text-[10px] text-gray-500 space-y-0.5">
                  <div>245 stories | 1,203 clips | 89 rundowns</div>
                  <div>Size: 2.3 GB | Latency: 3ms</div>
                </div>
              </div>
              <div className="bg-nf-surface rounded-xl border border-nf-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-400">Storage — Warning</span>
                </div>
                <div className="text-[10px] text-gray-500 space-y-0.5">
                  <div>Input: 234 GB free</div>
                  <div className="text-amber-400">Edited: 89 GB free ⚠️</div>
                  <div>Archive: 1.2 TB free</div>
                </div>
              </div>
              <div className="bg-nf-surface rounded-xl border border-nf-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">MOS Teleprompter — Connected</span>
                </div>
                <div className="text-[10px] text-gray-500 space-y-0.5">
                  <div className="font-mono">192.168.1.50:10540</div>
                  <div>Last heartbeat: 2 seconds ago</div>
                </div>
              </div>
              <div className="bg-nf-surface rounded-xl border border-nf-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs font-bold text-red-400">MOS Viz Director — Disconnected</span>
                </div>
                <div className="text-[10px] text-gray-500 space-y-0.5">
                  <div className="font-mono">192.168.1.51:10541</div>
                  <div className="text-red-400">Last seen: 15 min ago</div>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-nf-surface rounded-xl border border-nf-border overflow-hidden">
              <div className="px-4 py-3 border-b border-nf-border">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Events</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nf-border/50">
                    <th className="text-[9px] uppercase tracking-widest text-gray-500 font-medium px-4 py-2 text-left w-20">Time</th>
                    <th className="text-[9px] uppercase tracking-widest text-gray-500 font-medium px-4 py-2 text-left w-8"></th>
                    <th className="text-[9px] uppercase tracking-widest text-gray-500 font-medium px-4 py-2 text-left w-28">Component</th>
                    <th className="text-[9px] uppercase tracking-widest text-gray-500 font-medium px-4 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {healthEvents.map((ev, i) => (
                    <tr key={i} className="border-b border-nf-border/20 hover:bg-nf-panel/20">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{ev.time}</td>
                      <td className="px-4 py-2.5">
                        {ev.severity === 'ok' && <CheckCircle size={11} className="text-emerald-400" />}
                        {ev.severity === 'warning' && <AlertTriangle size={11} className="text-amber-400" />}
                        {ev.severity === 'error' && <XCircle size={11} className="text-red-400" />}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{ev.component}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-300">{ev.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PLACEHOLDER SECTIONS ── */}
        {['storage', 'rundown', 'playout', 'users', 'fonts', 'automation'].includes(activeSection) && (
          <div>
            <h2 className="text-lg font-bold text-gray-200 capitalize">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">Configuration panel</p>
            <div className="bg-nf-surface rounded-xl border border-nf-border p-12 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <Settings size={32} className="mx-auto mb-3 text-gray-700" />
                <p className="text-sm">{sections.find(s => s.id === activeSection)?.label} — coming soon</p>
                <p className="text-[10px] text-gray-700 mt-1">This section will be built in the next sprint</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
