"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudSync,
  LayoutDashboard,
  Radio,
  Settings,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWsStatus } from "@/components/ws-context";
import { ModeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/enablements", label: "Enablements", icon: Radio },
  { href: "/settings/tak", label: "TAK Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useWsStatus();

  const takConnected = status?.tak_connected ?? false;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-border bg-sidebar">
        {/* Logo / brand */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 space-between w-full flex flex-row">
          <span className="font-semibold tracking-tight text-sidebar-foreground flex flex-row gap-2">
            <CloudSync className="h-5 w-5 text-primary" />
            CoT Stream Manager
          </span>
          <ModeToggle />
        </div>

        {/* TAK connection pill */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-xs text-sidebar-accent-foreground">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                takConnected ? "bg-green-500" : "bg-muted-foreground",
              )}
            />
            <span>
              {takConnected ? "TAKServer Connected" : "TAKServer Disconnected"}
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* <div className="px-4 pb-4 text-[10px] text-muted-foreground">
          TAK Manager v1.0
        </div> */}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
