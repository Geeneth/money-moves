import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { LockProvider } from "@/components/auth/lock-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Money Moves",
  description: "A local-first personal budgeting app built around biweekly pay periods.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <QueryProvider>
          <LockProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </LockProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
