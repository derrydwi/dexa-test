import { Confirmation } from "@/components/confirmation";
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
import { useEmployees, useEmployeeChange } from "./queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { initials } from "@/lib/format";
import { errorMessage } from "@/lib/http";
import type { User } from "@wfh/contracts";
import {
  Pencil,
  Plus,
  Search,
  UserRound,
  UserRoundCheck,
  UserRoundMinus,
} from "lucide-react";
import { useRef, useState } from "react";
import { EmployeeForm } from "./employee-form";

export function Employees({ user }: { user: User }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [changing, setChanging] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  const opener = useRef<HTMLButtonElement | null>(null);

  const query = useDebouncedValue(search);
  const employees = useEmployees(user.id, { q: query, status, page });
  const change = useEmployeeChange(user.id);

  const { data, isPending: loading } = employees;
  const error = employees.error ? errorMessage(employees.error) : "";
  const busy = change.isPending;
  const actionError = change.error ? errorMessage(change.error) : "";

  const changeStatus = async () => {
    if (!changing) {
      return;
    }
    try {
      await change.mutateAsync({
        employee: changing,
        ...(changing.active ? {} : { input: { status: "active" } }),
      });
      setNotice(
        `${changing.fullName} has been ${changing.active ? "deactivated" : "reactivated"}.`,
      );
      setChanging(null);
      setPage(1);
    } catch {
      /* The confirmation displays the mutation error. */
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Employees</h1>
          <p>The people behind your everyday progress.</p>
        </div>
        <Button
          variant="default"
          onClick={(event) => {
            opener.current = event.currentTarget;
            setEditing("new");
          }}
        >
          <Plus size={18} />
          Add employee
        </Button>
      </div>
      {notice && (
        <div className="success-notice" role="status">
          {notice}
        </div>
      )}
      <section className="data-panel" aria-label="Employee directory">
        <div className="panel-heading">
          <div>
            <h2>Employee directory</h2>
            <p>Manage profiles, access, and account status.</p>
          </div>
          <span className="count-label">
            {data
              ? `${data.total} ${data.total === 1 ? "employee" : "employees"}`
              : "Employees"}
          </span>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <Input
              aria-label="Search employees"
              type="search"
              placeholder="Search name, email, or department…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="filter-select">
            <span>Status</span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Employee status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="active">Active employees</SelectItem>
                <SelectItem value="inactive">Inactive employees</SelectItem>
                <SelectItem value="all">All employees</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <ErrorNotice message={error} retry={() => void employees.refetch()} />
        {loading ? (
          <Loading />
        ) : (
          data &&
          (data.items.length ? (
            <PaginatedTable total={data.total} page={page} onPage={setPage}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee code</TableHead>
                    <TableHead>Department / role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="actions-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="person">
                          <span className="avatar table-avatar">
                            {initials(employee.fullName)}
                          </span>
                          <div>
                            <strong>{employee.fullName}</strong>
                            <span>{employee.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="employee-code">
                          {employee.employeeCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="cell-stack">
                          <span>{employee.department}</span>
                          <small>{employee.jobTitle}</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          status={employee.active ? "Active" : "Inactive"}
                        />
                      </TableCell>
                      <TableCell className="actions-cell">
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${employee.fullName}`}
                            title="Edit employee"
                            onClick={(event) => {
                              opener.current = event.currentTarget;
                              setEditing(employee);
                            }}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${employee.active ? "Deactivate" : "Reactivate"} ${employee.fullName}`}
                            title={
                              employee.active
                                ? "Deactivate account"
                                : "Reactivate account"
                            }
                            onClick={(event) => {
                              opener.current = event.currentTarget;
                              setChanging(employee);
                              change.reset();
                            }}
                          >
                            {employee.active ? (
                              <UserRoundMinus size={17} />
                            ) : (
                              <UserRoundCheck size={17} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PaginatedTable>
          ) : (
            <Empty
              title={query ? "No matching employees" : "No employees here yet"}
            >
              {query
                ? "Try another name, department, or email."
                : status === "inactive"
                  ? "Deactivated accounts will appear here. Attendance history is preserved."
                  : "Add an employee to give them access to attendance."}
            </Empty>
          ))
        )}
      </section>
      <div className="quiet-note">
        <UserRound size={16} />
        <p>
          Deactivating an account removes access while preserving its attendance
          history.
        </p>
      </div>
      {editing && (
        <EmployeeForm
          returnFocus={opener.current}
          userId={user.id}
          employee={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(
              editing === "new"
                ? "Employee created. Their account is ready to use."
                : "Employee details updated.",
            );
            setEditing(null);
          }}
        />
      )}{" "}
      {changing && (
        <Confirmation
          returnFocus={opener.current}
          title={`${changing.active ? "Deactivate" : "Reactivate"} ${changing.fullName}?`}
          danger={changing.active}
          busy={busy}
          error={actionError}
          confirm={() => void changeStatus()}
          onClose={() => setChanging(null)}
        >
          {changing.active
            ? "They will be signed out and unable to log in. Their attendance records and photos will remain available to HR."
            : "They will be able to sign in again using their existing password."}
        </Confirmation>
      )}
    </>
  );
}
