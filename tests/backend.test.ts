import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { IdentityClient } from "../apps/attendance/dist/identity-client/identity-client.service.js";
import { attendanceConfig } from "../apps/attendance/dist/config/configuration.js";
import { scryptSync } from "node:crypto";
import { verifyPassword } from "../apps/identity/src/auth/password";

test("async password verification accepts the existing scrypt format", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const stored = `${salt}:${scryptSync("ExistingPass123!", salt, 64).toString("hex")}`;
  assert.equal(await verifyPassword("ExistingPass123!", stored), true);
  assert.equal(
    await verifyPassword("ExistingPass123!", `${salt}:${"z".repeat(128)}`),
    false,
  );
});

test("identity client validates responses and fails closed on expiry and timeouts", async (t) => {
  const user = {
    id: "12345678-1234-4234-8234-123456789abc",
    employeeCode: "EMP-001",
    fullName: "Alex",
    email: "alex@wfh.test",
    department: "Engineering",
    jobTitle: "Developer",
    role: "EMPLOYEE",
    active: true,
  };
  let status = 200;
  let body: unknown = user;
  let slow = false;
  const server = createServer((_request, response) => {
    if (slow) {
      return;
    }
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const previous = attendanceConfig.identityUrl;
  attendanceConfig.identityUrl = `http://127.0.0.1:${address.port}`;
  const client = new IdentityClient();
  const token = "a".repeat(64);
  try {
    assert.deepEqual(await client.authenticate(token), user);
    for (const invalid of [
      null,
      {},
      { ...user, role: "ADMIN" },
      { ...user, fullName: 123 },
      { ...user, active: undefined },
    ]) {
      body = invalid;
      await assert.rejects(() => client.authenticate(token), { status: 503 });
    }
    body = { ...user, active: false };
    await assert.rejects(() => client.authenticate(token), { status: 401 });
    status = 401;
    await assert.rejects(() => client.authenticate(token), { status: 401 });
    status = 500;
    await assert.rejects(() => client.authenticate(token), { status: 503 });
    await assert.rejects(() => client.authenticate("invalid"), { status: 401 });
    status = 200;
    body = user;
    slow = true;
    const started = Date.now();
    await assert.rejects(() => client.authenticate(token), { status: 503 });
    assert.ok(Date.now() - started < 4500, "Identity timeout stays bounded.");
  } finally {
    attendanceConfig.identityUrl = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  t.diagnostic(
    "Real HTTP responses cover malformed identity data, inactive users, expiry, and the 2.5-second timeout.",
  );
});

test("attendance filter and returned status use one WIB date when a query crosses midnight", async (t) => {
  const { AttendanceService } =
    await import("../apps/attendance/dist/attendance/attendance.service.js");
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-02T16:59:59.999Z"),
  });
  const conditions: Record<string, string>[] = [];
  const row = {
    id: "12345678-1234-4234-8234-123456789abc",
    employeeId: "12345678-1234-4234-8234-123456789abc",
    employeeCode: "EMP-001",
    fullName: "Alex",
    department: "Engineering",
    workDate: "2026-10-02",
    checkInAt: new Date("2026-10-02T02:00:00Z"),
    checkOutAt: null,
    checkInPhoto: "test.jpg",
    checkOutPhoto: null,
  };
  const builder = {
    where: () => builder,
    andWhere: (_sql: string, params: Record<string, string>) => {
      conditions.push(params);

      return builder;
    },
    orderBy: () => builder,
    addOrderBy: () => builder,
    skip: () => builder,
    take: () => builder,
    getManyAndCount: async () => {
      t.mock.timers.tick(1);

      return [[row], 1];
    },
  };
  const service = new AttendanceService(
    { createQueryBuilder: () => builder },
    {},
  );
  const result = await service.list(
    { role: "HR" },
    { status: "Working", page: 1, pageSize: 20 },
  );
  assert.equal(conditions[0].today, "2026-10-02");
  assert.equal(
    result.items[0].status,
    "Working",
    "Status agrees with the work date used to filter this request.",
  );
});
