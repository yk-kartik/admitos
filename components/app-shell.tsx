"use client";

import {
  Bell,
  ChevronRight,
  Menu,
  Search,
  SunMoon,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { navigationItems } from "@/data/navigation";
import { Sidebar } from "@/components/sidebar";
import { AccountNavigation } from "@/components/account-navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      return window.localStorage.getItem("admitos-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("admitos-theme", theme);
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
  }, [theme]);

  if (pathname === "/") {
    return children;
  }

  const currentPage =
    navigationItems.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Dashboard";

  return (
    <div className="app-frame">
      <Sidebar
        activePath={pathname}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-nav-toggle"
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="breadcrumbs" aria-label="Breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} aria-hidden="true" />
              <strong>{currentPage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label="Toggle light and dark theme"
              title="Toggle light and dark theme"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
            >
              <SunMoon size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <label className="search-box">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search workspace"
                placeholder="Search workspace"
              />
            </label>
            <button
              className="icon-button"
              type="button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.8} />
            </button>
            <AccountNavigation activePath={pathname} variant="topbar" />
          </div>
        </header>

        <main id="main-content" className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}