import { ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorMessage } from "@/lib/http";
import type { User } from "@wfh/contracts";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useEmployees } from "./queries";

export function EmployeePicker({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: User | null;
  onChange: (user: User | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = useDebouncedValue(search);
  const employees = useEmployees(
    userId,
    { status: "all", pageSize: 100, q: query },
    open,
  );

  const loading = employees.isPending || search !== query;

  const select = (employee: User | null) => {
    onChange(employee);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="employee-filter">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label="Filter by employee"
            aria-expanded={open}
            className="w-full justify-between min-w-0"
          >
            <span className="truncate">
              {value
                ? `${value.fullName} (${value.employeeCode})`
                : "All employees"}
            </span>
            <ChevronsUpDown size={16} className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(360px,calc(100vw-40px))] p-0"
          align="start"
        >
          <Command
            label="Find an employee for attendance filtering"
            shouldFilter={false}
          >
            <CommandInput
              placeholder="Find an employee…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList aria-busy={employees.isFetching}>
              {loading ? (
                <Loading />
              ) : (
                <>
                  {employees.error && (
                    <ErrorNotice
                      message={errorMessage(employees.error)}
                      retry={() => void employees.refetch()}
                    />
                  )}
                  {employees.data && (
                    <>
                      <CommandEmpty>No matching employees.</CommandEmpty>
                      <CommandGroup>
                        {!search && (
                          <CommandItem
                            value="all"
                            onSelect={() => select(null)}
                          >
                            <span>All employees</span>
                            <Check
                              size={16}
                              className={value ? "opacity-0" : "opacity-100"}
                            />
                          </CommandItem>
                        )}
                        {employees.data.items.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={employee.id}
                            onSelect={() => select(employee)}
                            className="justify-between whitespace-normal break-words"
                          >
                            <span>
                              {employee.fullName} ({employee.employeeCode})
                              {!employee.active && " · Inactive"}
                            </span>
                            <Check
                              size={16}
                              className={
                                value?.id === employee.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              }
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {employees.data.total > employees.data.items.length && (
                        <p className="p-3 text-xs text-muted-foreground">
                          Showing the first 100 matches. Narrow your search to
                          find an employee.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
