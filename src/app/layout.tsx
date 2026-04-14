import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEWS FORGE | KAYAK",
  description: "News Room Computer System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="h-full bg-background text-foreground overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
