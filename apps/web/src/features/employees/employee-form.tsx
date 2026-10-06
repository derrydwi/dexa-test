import { ErrorNotice } from "@/components/feedback";
import { Field } from "@/components/form-field";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage } from "@/lib/http";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  User,
} from "@wfh/contracts";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEmployeeSchema,
  editEmployeeSchema,
  type EmployeeValues,
} from "./schema";
import { employeeKeys } from "./queries";
import { employeesApi } from "./api";

export function EmployeeForm({
  employee,
  userId,
  onClose,
  onSaved,
  returnFocus,
}: {
  employee?: User;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const client = useQueryClient();
  const form = useForm<EmployeeValues>({
    resolver: zodResolver(employee ? editEmployeeSchema : createEmployeeSchema),
    defaultValues: {
      fullName: employee?.fullName || "",
      employeeCode: employee?.employeeCode || "",
      email: employee?.email || "",
      department: employee?.department || "",
      jobTitle: employee?.jobTitle || "",
      password: "",
    },
  });
  const save = useMutation({
    mutationFn: (values: EmployeeValues) => {
      const { password, ...fields } = values;
      if (employee) {
        const input: UpdateEmployeeInput = {
          ...fields,
          ...(password ? { password } : {}),
        };

        return employeesApi.update(employee.id, input);
      }
      const input: CreateEmployeeInput = { ...fields, password };

      return employeesApi.create(input);
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: employeeKeys.all(userId) }),
  });

  const busy = form.formState.isSubmitting || save.isPending;

  const submit = async (values: EmployeeValues) => {
    try {
      await save.mutateAsync(values);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const name of [
          "fullName",
          "employeeCode",
          "email",
          "department",
          "jobTitle",
          "password",
        ] as const) {
          const messages = error.fieldErrors[name];
          if (messages) {
            form.setError(name, {
              type: "server",
              message: messages.join(" · "),
            });
          }
        }
      }
      form.setError("root.server", { message: errorMessage(error) });
    }
  };

  return (
    <Modal
      returnFocus={returnFocus}
      busy={busy}
      title={employee ? "Edit employee" : "Add employee"}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <p className="modal-description">
        {employee
          ? "Update their details or set a new password."
          : "Create a profile and login for your new team member."}
      </p>
      <form noValidate onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={busy} className="form-fields">
          <div className="form-two">
            <Field
              label="Full name"
              {...form.register("fullName")}
              error={form.formState.errors.fullName?.message}
              required
              minLength={2}
              maxLength={100}
              placeholder="Alex Morgan"
              autoComplete="name"
            />
            <Field
              label="Employee code"
              {...form.register("employeeCode")}
              error={form.formState.errors.employeeCode?.message}
              required
              minLength={2}
              maxLength={24}
              pattern="[A-Za-z0-9_-]+"
              placeholder="EMP-003"
              hint="Letters, numbers, hyphens and underscores"
            />
          </div>
          <Field
            label="Email address"
            {...form.register("email")}
            error={form.formState.errors.email?.message}
            type="email"
            required
            maxLength={254}
            placeholder="alex@company.com"
            autoComplete="email"
          />
          <div className="form-two">
            <Field
              label="Department"
              {...form.register("department")}
              error={form.formState.errors.department?.message}
              required
              maxLength={80}
              placeholder="Engineering"
            />
            <Field
              label="Job title"
              {...form.register("jobTitle")}
              error={form.formState.errors.jobTitle?.message}
              required
              maxLength={80}
              placeholder="Software Engineer"
            />
          </div>
          <Field
            label={employee ? "New password (optional)" : "Temporary password"}
            {...form.register("password")}
            error={form.formState.errors.password?.message}
            type="password"
            autoComplete="new-password"
            required={!employee}
            minLength={10}
            maxLength={128}
            placeholder="At least 10 characters"
            hint={
              employee
                ? "Leave blank to keep the current password. Resetting it signs them out."
                : "Share these credentials with the employee."
            }
          />
        </fieldset>
        <ErrorNotice
          message={form.formState.errors.root?.server?.message || ""}
        />
        <div className="modal-actions">
          <Button
            variant="outline"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button variant="default" disabled={busy}>
            {busy ? "Saving…" : employee ? "Save changes" : "Create employee"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
