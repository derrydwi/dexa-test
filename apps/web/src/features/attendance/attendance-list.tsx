import { Empty, ErrorNotice, Loading } from "@/components/feedback";
import { PaginatedTable } from "@/components/paginated-table";
import { Badge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeePicker } from "@/features/employees/employee-picker";
import { useAttendance } from "./queries";
import { errorMessage } from "@/lib/http";
import { dateWib, formatDate, initials, timeWib } from "@/lib/format";
import type { User } from "@wfh/contracts";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PhotoButton } from "./photo-button";

export function AttendanceList({
  user,
  compact = false,
}: {
  user: User;
  compact?: boolean;
}) {
  const hr = user.role === "HR";

  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(hr ? dateWib() : "");
  const [to, setTo] = useState(hr ? dateWib() : "");
  const [status, setStatus] = useState("all");
  const [employee, setEmployee] = useState<User | null>(null);

  const records = useAttendance(user.id, {
    page,
    pageSize: compact ? 5 : 20,
    from,
    to,
    ...(status !== "all" ? { status } : {}),
    ...(employee ? { employeeId: employee.id } : {}),
  });

  const { data, isPending: loading } = records;
  const error = records.error ? errorMessage(records.error) : "";

  const reset = () => {
    setFrom("");
    setTo("");
    setStatus("all");
    setEmployee(null);
    setPage(1);
  };

  return (
    <>
      {!compact && (
        <div className="page-heading">
          <div>
            <h1>{hr ? "Attendance" : "Attendance history"}</h1>
            <p>
              {hr
                ? "A clear view of your team’s workdays."
                : "Your workdays, photos, and timestamps in one place."}
            </p>
          </div>
          <span className="read-only-label">
            <ShieldCheck size={16} />
            {hr ? "View-only access" : "Recorded in WIB"}
          </span>
        </div>
      )}
      <section
        className={`data-panel ${compact ? "recent-panel" : ""}`}
        aria-label={compact ? "Recent attendance" : "Attendance records"}
      >
        <div className="panel-heading">
          <div>
            <h2>{compact ? "Recent attendance" : "Attendance records"}</h2>
            <p>
              {compact
                ? "Your latest workdays at a glance."
                : "Photo evidence and server-recorded times."}
            </p>
          </div>
          <span className="count-label">
            {data
              ? `${data.total} ${data.total === 1 ? "record" : "records"}`
              : "Records"}
          </span>
        </div>
        {!compact && (
          <div className="attendance-filters">
            {hr && (
              <EmployeePicker
                userId={user.id}
                value={employee}
                onChange={(value) => {
                  setEmployee(value);
                  setPage(1);
                }}
              />
            )}
            <label className="filter-field">
              <span>From</span>
              <Input
                type="date"
                aria-label="From date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="filter-field">
              <span>To</span>
              <Input
                type="date"
                aria-label="To date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="filter-field">
              <span>Status</span>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Attendance status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <Button
              variant="link"
              size="sm"
              className="reset-filter"
              onClick={reset}
            >
              Reset filters
            </Button>
          </div>
        )}
        <ErrorNotice message={error} retry={() => void records.refetch()} />
        {loading ? (
          <Loading />
        ) : (
          data &&
          (data.items.length ? (
            <PaginatedTable
              total={data.total}
              page={page}
              pageSize={compact ? 5 : 20}
              onPage={setPage}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {hr && <TableHead>Employee</TableHead>}
                    <TableHead>Work date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Photo evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((record) => (
                    <TableRow key={record.id}>
                      {hr && (
                        <TableCell>
                          <div className="person">
                            <span className="avatar table-avatar">
                              {initials(record.fullName)}
                            </span>
                            <div>
                              <strong>{record.fullName}</strong>
                              <span>
                                {record.employeeCode} · {record.department}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="date-cell">
                        {formatDate(record.workDate)}
                      </TableCell>
                      <TableCell className="time-cell">
                        {timeWib(record.checkInAt)} <small>WIB</small>
                      </TableCell>
                      <TableCell className="time-cell">
                        {timeWib(record.checkOutAt)}{" "}
                        {record.checkOutAt && <small>WIB</small>}
                      </TableCell>
                      <TableCell>
                        <Badge status={record.status} />
                      </TableCell>
                      <TableCell>
                        <div className="photo-links">
                          <PhotoButton
                            url={record.checkInPhoto}
                            label="Check-in"
                          />
                          <PhotoButton
                            url={record.checkOutPhoto}
                            label="Check-out"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PaginatedTable>
          ) : (
            <Empty title="No attendance records">
              {hr
                ? "Submitted attendance will appear here. Try changing the date or employee filters."
                : "Your submitted workdays will appear here after your first check-in."}
            </Empty>
          ))
        )}
      </section>
    </>
  );
}
