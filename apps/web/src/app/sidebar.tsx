import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import type { User } from "@wfh/contracts";
import { CalendarDays, Clock3, House, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";

export function Sidebar({
  user,
  onNavigate,
}: {
  user: User;
  onNavigate?: () => void;
}) {
  const hr = user.role === "HR";

  return (
    <>
      <div className="sidebar-brand">
        <Brand light />
        <Button
          variant="ghost"
          size="icon-sm"
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => onNavigate?.()}
        >
          <X size={20} />
        </Button>
      </div>
      <nav aria-label="Main navigation" onClick={() => onNavigate?.()}>
        {hr ? (
          <>
            <NavLink to="/employees">
              <Users size={19} />
              Employees
            </NavLink>
            <NavLink to="/attendance">
              <CalendarDays size={19} />
              Attendance
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/today">
              <House size={19} />
              My workday
            </NavLink>
            <NavLink to="/history">
              <CalendarDays size={19} />
              Attendance history
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-note">
        <Clock3 size={20} />
        <strong>Every workday counts.</strong>
        <p>
          Your attendance is recorded
          <br />
          in Western Indonesia Time.
        </p>
        <span>WIB · UTC+7</span>
      </div>
      <div className="sidebar-user">
        <span className="avatar">{initials(user.fullName)}</span>
        <div>
          <strong>{user.fullName}</strong>
          <small>{hr ? "HR administrator" : user.department}</small>
        </div>
      </div>
    </>
  );
}
