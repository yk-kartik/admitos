"use client";

import {
  Bell,
  ChevronDown,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { navigationItems } from "@/data/navigation";
import { Sidebar } from "@/components/sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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
            <Link className="profile-chip" href="/profile">
              <span className="profile-avatar" aria-hidden="true">
                MC
              </span>
              <span className="profile-copy">
                <strong>Maya Chen</strong>
                <small>Student workspace</small>
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main id="main-content" className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}