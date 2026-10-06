import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { loginSchema } from "../apps/web/src/features/auth/schema";
import {
  createEmployeeSchema,
  editEmployeeSchema,
} from "../apps/web/src/features/employees/schema";
import { photoSchema } from "../apps/web/src/features/attendance/schema";
import { api, ApiError } from "../apps/web/src/lib/http";
import { advanceSession } from "../apps/web/src/lib/session-boundary";
import {
  changeSession,
  queryClient,
  sessionKey,
} from "../apps/web/src/lib/query-client";

test("forms match normalization, field limits and optional edit password", () => {
  const employee = {
    fullName: " Alex ",
    employeeCode: " emp-3 ",
    email: " ALEX@WFH.TEST ",
    department: " Engineering ",
    jobTitle: " Developer ",
    password: "  Password123!  ",
  };
  const parsed = createEmployeeSchema.parse(employee);
  assert.equal(parsed.employeeCode, "EMP-3");
  assert.equal(parsed.email, "alex@wfh.test");
  assert.equal(parsed.fullName, "Alex");
  assert.equal(parsed.password, employee.password);
  assert.equal(
    editEmployeeSchema.parse({ ...employee, password: "" }).password,
    "",
  );
  for (const values of [
    { ...employee, password: "short" },
    { ...employee, fullName: "x" },
    { ...employee, employeeCode: "bad code" },
    { ...employee, department: " " },
    { ...employee, fullName: "x".repeat(101) },
  ]) {
    assert.equal(createEmployeeSchema.safeParse(values).success, false);
  }
  assert.equal(
    editEmployeeSchema.safeParse({ ...employee, password: "short" }).success,
    false,
  );
  assert.equal(
    loginSchema.parse({ email: " HR@WFH.TEST ", password: " " }).password,
    " ",
  );
  assert.equal(
    loginSchema.safeParse({ email: "wrong", password: "" }).success,
    false,
  );
});

test("photo schema validates MIME, nonempty files and the exact 5MB boundary", () => {
  assert.equal(
    photoSchema.safeParse(new File(["x"], "photo.png", { type: "image/png" }))
      .success,
    true,
  );
  assert.equal(
    photoSchema.safeParse(new File([], "photo.png", { type: "image/png" }))
      .success,
    false,
  );
  assert.equal(
    photoSchema.safeParse(
      new File(["x"], "photo.svg", { type: "image/svg+xml" }),
    ).success,
    false,
  );
  assert.equal(
    photoSchema.safeParse(
      new File([new Uint8Array(5 * 1024 * 1024)], "photo.webp", {
        type: "image/webp",
      }),
    ).success,
    true,
  );
  assert.equal(
    photoSchema.safeParse(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "photo.jpg", {
        type: "image/jpeg",
      }),
    ).success,
    false,
  );
});

test("queries isolate filters/accounts, cancel reads and invalidate attendance", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let signal: AbortSignal | undefined;
  const key = ["attendance", "employee-a", { page: 1 }];
  const pending = client
    .fetchQuery({
      queryKey: key,
      queryFn: ({ signal: next }) => {
        signal = next;

        return new Promise(() => {});
      },
    })
    .catch(() => undefined);
  await client.cancelQueries({ queryKey: ["attendance", "employee-a"] });
  assert.equal(signal?.aborted, true);
  await pending;
  client.setQueryData(key, ["own record"]);
  assert.equal(
    client.getQueryData(["attendance", "employee-b", { page: 1 }]),
    undefined,
  );
  assert.equal(
    client.getQueryData(["attendance", "employee-a", { page: 2 }]),
    undefined,
  );
  await client.invalidateQueries({ queryKey: ["attendance", "employee-a"] });
  assert.equal(client.getQueryState(key)?.isInvalidated, true);
  client.clear();
});

test("session boundaries discard caches and reject late HTTP responses", async () => {
  const fetchBefore = globalThis.fetch;
  const response = Promise.withResolvers<Response>();
  globalThis.fetch = async () => response.promise;
  try {
    queryClient.setQueryData(["employees", "hr-a"], ["private"]);
    queryClient.setQueryData(["attendance", "employee-a"], ["private"]);
    const pending = api("/api/employees");
    changeSession(null);
    assert.equal(queryClient.getQueryData(["employees", "hr-a"]), undefined);
    assert.equal(
      queryClient.getQueryData(["attendance", "employee-a"]),
      undefined,
    );
    assert.equal(queryClient.getQueryData(sessionKey), null);
    response.resolve(
      new Response(JSON.stringify({ private: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await assert.rejects(pending, { name: "AbortError" });
    const retry = queryClient.getDefaultOptions().queries?.retry;
    assert.equal(typeof retry, "function");
    if (typeof retry === "function") {
      assert.equal(retry(0, new ApiError("unavailable", 503)), true);
      assert.equal(retry(1, new ApiError("unavailable", 503)), false);
      assert.equal(retry(0, new ApiError("expired", 401)), false);
      assert.equal(
        retry(0, new DOMException("cancelled", "AbortError")),
        false,
      );
    }
  } finally {
    globalThis.fetch = fetchBefore;
    advanceSession();
    queryClient.clear();
  }
});
