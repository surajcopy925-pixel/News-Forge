import TopNav from "@/components/TopNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-hidden h-main relative">
        {children}
      </main>
    </div>
  );
}
