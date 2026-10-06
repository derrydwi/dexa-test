import { ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useWorkDate } from "@/hooks/use-work-date";
import { formatDate } from "@/lib/format";
import type { User } from "@wfh/contracts";
import { LogOut, Menu } from "lucide-react";
import { useRef, useState } from "react";
import { AppRoutes } from "./routes";
import { Sidebar } from "./sidebar";

export function AppLayout({
  user,
  error,
  logoutBusy,
  logout,
}: {
  user: User;
  error: string;
  logoutBusy: boolean;
  logout: () => Promise<void>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLButtonElement>(null);

  const day = useWorkDate(user.id);

  const hr = user.role === "HR";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Sidebar user={user} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="sidebar open sheet-navigation"
          showCloseButton={false}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <Button
              variant="ghost"
              size="icon-sm"
              className="mobile-menu"
              ref={menuRef}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </Button>
            <span className="workspace-label">
              {hr ? "People workspace" : "Employee workspace"}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-date">{formatDate(day)}</span>
          </div>
          <Button
            variant="ghost"
            className="signout"
            onClick={() => void logout()}
            disabled={logoutBusy}
          >
            <LogOut size={16} />
            {logoutBusy ? "Signing out…" : "Sign out"}
          </Button>
        </header>
        <main id="main-content" className="main-content">
          <ErrorNotice message={error} />
          <AppRoutes user={user} />
        </main>
        <footer className="workspace-footer">
          <span>WFH Attendance</span>
          <span>All times shown in WIB (UTC+7)</span>
        </footer>
      </div>
    </div>
  );
}
