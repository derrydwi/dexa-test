import { lazy, Suspense } from "react";
import { Loading } from "@/components/feedback";
import type { User } from "@wfh/contracts";
import { Navigate, Route, Routes } from "react-router-dom";

const AttendanceList = lazy(() =>
  import("@/features/attendance/attendance-list").then((module) => ({
    default: module.AttendanceList,
  })),
);
const Today = lazy(() =>
  import("@/features/attendance/workday-page").then((module) => ({
    default: module.Today,
  })),
);
const Employees = lazy(() =>
  import("@/features/employees/employees-page").then((module) => ({
    default: module.Employees,
  })),
);

export function AppRoutes({ user }: { user: User }) {
  const hr = user.role === "HR";

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {hr ? (
          <>
            <Route path="/employees" element={<Employees user={user} />} />
            <Route
              path="/attendance"
              element={<AttendanceList user={user} />}
            />
            <Route path="*" element={<Navigate to="/employees" replace />} />
          </>
        ) : (
          <>
            <Route path="/today" element={<Today user={user} />} />
            <Route path="/history" element={<AttendanceList user={user} />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}
