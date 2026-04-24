'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  User, 
  Upload, 
  ArrowRightFromLine, 
  PenTool, 
  LayoutList, 
  Settings, 
  Bell
} from 'lucide-react';

const TABS = [
  { id: 'workspace', label: 'workspace', icon: User, href: '/workspace' },
  { id: 'input', label: 'input', icon: Upload, href: '/input' },
  { id: 'output', label: 'output', icon: ArrowRightFromLine, href: '/output' },
  { id: 'editor-hub', label: 'editor-hub', icon: PenTool, href: '/editor-hub' },
  { id: 'rundown', label: 'rundown', icon: LayoutList, href: '/rundown' },
  { id: 'settings', label: 'settings', icon: Settings, href: '/settings' },
];

import UserMenu from './UserMenu';
import CasparIndicator from './CasparIndicator';

export default function TopNav() {
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const [rundownId, setRundownId] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toTimeString().slice(0, 8));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const readRundownId = () => {
      const params = new URLSearchParams(window.location.search);
      setRundownId(params.get('rundownId'));
    };

    readRundownId();
    window.addEventListener('popstate', readRundownId);
    return () => window.removeEventListener('popstate', readRundownId);
  }, [pathname]);

  return (
    <nav className="h-12 w-full bg-nf-bg border-b border-nf-border flex items-center px-4 shrink-0 z-50 select-none">
      {/* LEFT: Logo */}
      <div className="flex items-center w-[180px] mr-8">
        <Link href="/rundown" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/10 transition-transform group-hover:scale-105">
            <span className="text-white font-extrabold text-sm">N</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white font-bold text-sm tracking-wide">NEWS FORGE</span>
            <span className="text-gray-500 text-[9px] tracking-widest mt-0.5">BY KAYAK</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all
                ${isActive 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-nf-panel/50'
                }
              `}
            >
              <Icon size={15} />
              <span className="capitalize">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-[-6px] left-2 right-2 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* RIGHT: Status + Clock + Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Connection Status Indicators */}
        <div className="flex items-center gap-3 mr-2">
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            <span className="text-gray-500 text-[10px] font-medium tracking-tight group-hover:text-gray-400 transition-colors">MOS</span>
          </div>
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            <span className="text-gray-500 text-[10px] font-medium tracking-tight group-hover:text-gray-400 transition-colors">VIZ</span>
          </div>
          <CasparIndicator rundownId={rundownId} />
        </div>

        {/* Real-time Clock */}
        <div className="bg-nf-bg border border-nf-border rounded-md px-3 py-1 flex items-center min-w-[100px] justify-center">
          <span className="font-mono text-sm font-bold text-emerald-400 tracking-wider tabular-nums">
            {time || '00:00:00'}
          </span>
          <span className="text-gray-600 text-[9px] ml-1.5 font-medium select-none">IST</span>
        </div>

        {/* Quick Notifications */}
        <button className="relative p-1.5 text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-full group">
          <Bell size={16} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-nf-bg" />
        </button>

        {/* User Information Profile */}
        <div className="pl-3 border-l border-nf-border ml-1">
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

