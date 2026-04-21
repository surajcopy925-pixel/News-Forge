'use client';

import TopNav from "@/components/TopNav";
import { useSSE } from '@/hooks/useSSE';
import { Toaster } from 'sonner';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-hidden h-main relative">
        {children}
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
