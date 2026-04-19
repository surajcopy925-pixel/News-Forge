'use client';

import { Suspense, useState } from 'react';
import {
  Settings, HardDrive, LayoutList, Cable, MonitorPlay,
  Users, Type, Bot, Activity
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const sections = [
  { id: 'general', label: 'General', icon: Settings, href: '/settings' },
  { id: 'storage', label: 'Storage & Paths', icon: HardDrive, href: '/settings?section=storage' },
  { id: 'rundown', label: 'Rundown Config', icon: LayoutList, href: '/settings?section=rundown' },
  { id: 'mos', label: 'MOS Connections', icon: Cable, href: '/settings?section=mos' },
  { id: 'playout', label: 'Playout Engine', icon: MonitorPlay, href: '/settings?section=playout' },
  { id: 'users', label: 'Users & Roles', icon: Users, href: '/settings?section=users' },
  { id: 'fonts', label: 'Font Management', icon: Type, href: '/settings?section=fonts' },
  { id: 'automation', label: 'Automation', icon: Bot, href: '/settings?section=automation' },
  { id: 'health', label: 'System Health', icon: Activity, href: '/settings?section=health' },
];

function SettingsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'general';

  return (
    <div className="w-56 shrink-0 bg-nf-surface border-r border-nf-border p-2 overflow-y-auto">
      {sections.map(sec => {
        const Icon = sec.icon;
        const isActive = sec.href.includes('section=')
          ? activeSection === sec.id
          : pathname === sec.href;

        return (
          <Link
            key={sec.id}
            href={sec.href}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-colors
              ${isActive
                ? 'bg-blue-500/10 text-blue-400 border-l-2 border-l-blue-500'
                : 'text-gray-400 hover:bg-nf-panel/50 hover:text-gray-300 border-l-2 border-l-transparent'
              }`}
          >
            <Icon size={15} />
            {sec.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Suspense fallback={<div className="w-56 shrink-0 bg-nf-surface border-r border-nf-border p-2" />}>
        <SettingsNav />
      </Suspense>
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
