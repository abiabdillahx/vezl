import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Button, Tooltip } from "@heroui/react";
import { useAuth } from "@/contexts/AuthContext";

const LINK_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const SETTINGS_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const USERS_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const SHIELD_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const LOGOUT_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
  ${isActive
    ? "bg-accent-subtle text-text-primary border border-accent/40"
    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised border border-transparent"
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-canvas border-r border-border">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border-subtle">
          <span className="text-lg font-semibold text-text-primary tracking-tight">vezl</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <NavLink to="/links" className={navLinkClass}>
            {LINK_ICON}
            Links
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            {SETTINGS_ICON}
            Settings
          </NavLink>

          {user?.role === "admin" && (
            <>
              <div className="pt-4 pb-1 px-2">
                <span className="text-xs text-text-tertiary">Admin</span>
              </div>
              <NavLink to="/admin/users" className={navLinkClass}>
                {USERS_ICON}
                Users
              </NavLink>
              <NavLink to="/admin/watchlist" className={navLinkClass}>
                {SHIELD_ICON}
                Watchlist
              </NavLink>
            </>
          )}
        </nav>

        {/* User row */}
        <div className="p-3 border-t border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-xs font-medium text-text-secondary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.username}</p>
            <p className="text-xs text-text-tertiary capitalize">{user?.role}</p>
          </div>
          <Tooltip content="Logout" placement="right">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="text-text-secondary hover:text-text-primary shrink-0"
              onPress={handleLogout}
            >
              {LOGOUT_ICON}
            </Button>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-surface-elevated">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
