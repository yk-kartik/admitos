import { Sparkles } from "lucide-react";
import Link from "next/link";
import { navigationItems } from "@/data/navigation";
import { AccountNavigation } from "@/components/account-navigation";

type SidebarProps = {
  activePath: string;
  mobileOpen: boolean;
  onNavigate: () => void;
};

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  activePath,
  mobileOpen,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}
      aria-label="Main navigation"
    >
      <Link className="brand-row" href="/" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden="true">
          A
        </span>
        <span className="brand-wordmark">
          admit<span>OS</span>
        </span>
      </Link>

      <div className="sidebar-section-title">YOUR WORKSPACE</div>
      <nav className="primary-nav">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(activePath, item.href);
          return (
            <Link
              key={item.href}
              className={`nav-link${active ? " nav-link-active" : ""}`}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
              {item.href === "/applications" && (
                <span className="nav-count" aria-label="3 in progress">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="cycle-card">
          <span className="cycle-icon" aria-hidden="true">
            <Sparkles size={16} strokeWidth={1.8} />
          </span>
          <span className="cycle-copy">
            <span>FALL 2027</span>
            <strong>Application cycle</strong>
          </span>
        </div>
        <AccountNavigation activePath={activePath} onNavigate={onNavigate} variant="sidebar" />
      </div>
    </aside>
  );
}