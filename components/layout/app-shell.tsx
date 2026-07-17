"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  layoutId,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  layoutId: string;
  onNavigate?: () => void;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-sidebar-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
      )}
    >
      {active ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-sidebar-foreground/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      ) : null}
      <Icon className="relative h-4 w-4 shrink-0" />
      <span className="relative">{label}</span>
    </Link>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }): React.JSX.Element {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-foreground/10 bg-sidebar md:flex">
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            layoutId="desktop-nav-active"
          />
        ))}
      </nav>
    </aside>
  );
}

function MobileHeader({ onOpen }: { onOpen: () => void }): React.JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (pathname?.startsWith("/onboarding")) {
    return <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar pathname={pathname ?? ""} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <nav className="flex flex-col gap-1 px-3 pt-4 pb-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(pathname ?? "", item.href)}
                layoutId="mobile-nav-active"
                onNavigate={() => setDrawerOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col md:pl-60">
        <MobileHeader onOpen={() => setDrawerOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
