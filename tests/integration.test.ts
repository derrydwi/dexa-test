import "@wfh/common";
import { test } from "node:test";
import { removeTestPhotos } from "./cleanup";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";
import { DataSource } from "typeorm";
import {
  workDate,
  type User,
  type AttendanceRecord,
  type Page,
} from "@wfh/contracts";

// Run against the local Node services or Docker Compose. Creates and removes only its own test accounts.
const identity = process.env.TEST_BASE_URL || "http://localhost:3001";
const attendance = process.env.TEST_BASE_URL || "http://localhost:3002";
const origin =
  process.env.TEST_ORIGIN || process.env.APP_ORIGIN || "http://localhost:5173";

async function request(
  path: string,
  cookie = "",
  method = "GET",
  body?: object | FormData,
  customOrigin = origin,
) {
  const response = await fetch(
    `${path.startsWith("/api/attendance") ? attendance : identity}${path}`,
    {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: customOrigin,
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    },
  );
  const type = response.headers.get("content-type") || "";
  const data = type.includes("json") ? await response.json() : null;

  return { response, data };
}

async function login(
  email: string,
  password = process.env.DEMO_PASSWORD || "DemoPass123!",
) {
  const result = await request("/api/auth/login", "", "POST", {
    email,
    password,
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));

  return {
    cookie: result.response.headers.get("set-cookie")!.split(";")[0],
    setCookie: result.response.headers.get("set-cookie")!,
    user: result.data as User,
  };
}

const identityDb = new DataSource({
  type: "mysql",
  url:
    process.env.IDENTITY_DATABASE_URL ||
    "mysql://identity:identity_local@127.0.0.1:3307/identity_db",
  timezone: "Z",
});
const attendanceDb = new DataSource({
  type: "mysql",
  url:
    process.env.ATTENDANCE_DATABASE_URL ||
    "mysql://attendance:attendance_local@127.0.0.1:3307/attendance_db",
  timezone: "Z",
});

test("real MySQL API workflow and security boundaries", async (t) => {
  await identityDb.initialize();
  await attendanceDb.initialize();
  const suffix = randomUUID().slice(0, 8);
  const ids: string[] = [];
  const localDirectory = process.env.TEST_UPLOAD_DIR;
  const initialFiles = localDirectory
    ? await readdir(localDirectory).catch(() => [])
    : [];
  const cleanupFiles: string[] = [];
  let employee: Awaited<ReturnType<typeof login>>;
  let other: Awaited<ReturnType<typeof login>>;
  const hr = await login("hr@wfh.test");
  const password = "TestPass123!";
  const photo = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#147d70" },
  })
    .png()
    .toBuffer();

  function upload(buffer = photo, filename = "work.png", type = "image/png") {
    const form = new FormData();
    form.append(
      "photo",
      new Blob([new Uint8Array(buffer)], { type }),
      filename,
    );

    return form;
  }

  let record: AttendanceRecord;
  try {
    await t.test(
      "login, cookies, authorization and input validation",
      async () => {
        assert.match(hr.cookie, /^wfh_session=[a-f0-9]{64}$/);
        assert.match(hr.setCookie, /HttpOnly/i);
        assert.match(hr.setCookie, /SameSite=Lax/i);
        assert.match(hr.setCookie, /Max-Age=43200/i);
        assert.match(hr.setCookie, /Path=\//i);
        assert.equal((await request("/api/auth/me")).response.status, 401);
        assert.equal(
          (
            await request("/api/auth/login", "", "POST", {
              email: "hr@wfh.test",
              password: "wrong",
            })
          ).response.status,
          401,
        );
        assert.equal(
          (
            await request("/api/auth/login", "", "POST", {
              email: "bad",
              password: "password",
            })
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/employees",
              hr.cookie,
              "POST",
              {},
              "https://untrusted.example",
            )
          ).response.status,
          403,
        );
        const definition = (index: number) => ({
          employeeCode: `TEST-${suffix}-${index}`,
          fullName: `Test Employee ${index}`,
          email: `test-${suffix}-${index}@wfh.test`,
          department: "Quality Assurance",
          jobTitle: "Test Engineer",
          password,
        });
        for (const index of [1, 2]) {
          const result = await request(
            "/api/employees",
            hr.cookie,
            "POST",
            definition(index),
          );
          assert.equal(
            result.response.status,
            201,
            JSON.stringify(result.data),
          );
          ids.push(result.data.id);
          assert.equal("passwordHash" in result.data, false);
          assert.equal(result.data.role, "EMPLOYEE");
        }
        employee = await login(definition(1).email, password);
        await identityDb.query(
          "UPDATE sessions SET expiresAt = '2000-01-01 00:00:00' WHERE employeeId = ?",
          [employee.user.id],
        );
        assert.equal(
          (await request("/api/auth/me", employee.cookie)).response.status,
          401,
        );
        assert.equal(
          (await request("/api/attendance", employee.cookie)).response.status,
          401,
        );
        employee = await login(definition(1).email, password);
        other = await login(definition(2).email, password);
        assert.equal(
          (
            await request(`/api/employees/${hr.user.id}`, hr.cookie, "PATCH", {
              fullName: "Forbidden HR edit",
            })
          ).response.status,
          403,
        );
        assert.equal(
          (await request(`/api/employees/${hr.user.id}`, hr.cookie, "DELETE"))
            .response.status,
          403,
        );
        assert.equal(
          (await request("/api/employees", employee.cookie)).response.status,
          403,
        );
        assert.equal(
          (
            await request("/api/employees", hr.cookie, "POST", {
              ...definition(3),
              role: "HR",
            })
          ).response.status,
          400,
        );
        assert.equal(
          (await request("/api/employees", hr.cookie, "POST", definition(1)))
            .response.status,
          409,
        );
        assert.equal(
          (
            await request(
              `/api/employees/${employee.user.id}`,
              hr.cookie,
              "PATCH",
              { fullName: null },
            )
          ).response.status,
          400,
        );
        assert.equal(
          (await request("/api/employees?pageSize=1000", hr.cookie)).response
            .status,
          400,
        );
        const updated = await request(
          `/api/employees/${employee.user.id}`,
          hr.cookie,
          "PATCH",
          { fullName: "Updated Employee" },
        );
        assert.equal(updated.response.status, 200);
        const filtered = await request(
          `/api/employees?q=TEST-${suffix}`,
          hr.cookie,
        );
        assert.equal((filtered.data as Page<User>).total, 2);
        const first = await request(
          `/api/employees?q=TEST-${suffix}&pageSize=1&page=1`,
          hr.cookie,
        );
        const second = await request(
          `/api/employees?q=TEST-${suffix}&pageSize=1&page=2`,
          hr.cookie,
        );
        assert.equal(first.data.items.length, 1);
        assert.equal(second.data.items.length, 1);
        assert.notEqual(first.data.items[0].id, second.data.items[0].id);
        assert.equal(
          (await request(`/api/employees/${employee.user.id}`, hr.cookie)).data
            .fullName,
          "Updated Employee",
        );
      },
    );
    await t.test(
      "missing, fake, truncated, unsupported and oversized photos are rejected",
      async () => {
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              new FormData(),
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              upload(Buffer.from("not an image")),
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              upload(
                Buffer.from(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>',
                ),
                "work.jpg",
                "image/jpeg",
              ),
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              upload(photo.subarray(0, 40)),
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              upload(Buffer.alloc(5 * 1024 * 1024 + 1)),
            )
          ).response.status,
          413,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-in",
              hr.cookie,
              "POST",
              upload(),
            )
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request(
              "/api/attendance/check-out",
              other.cookie,
              "POST",
              upload(),
            )
          ).response.status,
          400,
        );
        if (localDirectory) {
          assert.deepEqual(
            (await readdir(localDirectory)).sort(),
            initialFiles.sort(),
          );
        }
      },
    );
    await t.test(
      "concurrent check-ins persist exactly one record with server timestamps",
      async () => {
        const results = await Promise.all(
          [1, 2, 3].map(() =>
            request(
              "/api/attendance/check-in",
              employee.cookie,
              "POST",
              upload(),
            ),
          ),
        );
        assert.deepEqual(
          results.map((result) => result.response.status).sort(),
          [201, 409, 409],
        );
        record = results.find((result) => result.response.status === 201)!.data;
        assert.equal(record.status, "Working");
        assert.equal(record.workDate, workDate());
        assert.equal(record.fullName, "Updated Employee");
        const successfulResponse = results.find(
          (result) => result.response.status === 201,
        )!.response;
        const serviceClock = Date.parse(
          successfulResponse.headers.get("date")!,
        );
        assert.ok(
          Math.abs(Date.parse(record.checkInAt) - serviceClock) < 10000,
          "Timestamp must match the service clock, not the test client clock.",
        );
        assert.equal(
          Number(
            (
              await attendanceDb.query(
                "SELECT COUNT(*) AS n FROM attendance WHERE employeeId = ?",
                [employee.user.id],
              )
            )[0].n,
          ),
          1,
        );
        const rows = await attendanceDb.query(
          "SELECT checkInPhoto FROM attendance WHERE id = ?",
          [record.id],
        );
        cleanupFiles.push(rows[0].checkInPhoto);
        assert.equal(
          (await request(`/api/attendance/${record.id}/photos/check-in`))
            .response.status,
          401,
        );
        assert.equal(
          (await request(record.checkInPhoto, other.cookie)).response.status,
          403,
        );
        const evidence = await request(record.checkInPhoto, hr.cookie);
        assert.equal(evidence.response.status, 200);
        assert.equal(
          evidence.response.headers.get("content-type"),
          "image/jpeg",
        );
        const metadata = await sharp(
          Buffer.from(await evidence.response.arrayBuffer()),
        ).metadata();
        assert.equal(metadata.format, "jpeg");
        assert.equal(metadata.exif, undefined);
        await attendanceDb.query(
          "UPDATE attendance SET checkInPhoto = ? WHERE id = ?",
          [`${randomUUID()}.jpg`, record.id],
        );
        try {
          const missing = await request(record.checkInPhoto, hr.cookie);
          assert.equal(missing.response.status, 404);
          assert.equal(missing.data.statusCode, 404);
          assert.match(missing.data.message, /unavailable/);
          assert.ok(missing.data.timestamp);
        } finally {
          await attendanceDb.query(
            "UPDATE attendance SET checkInPhoto = ? WHERE id = ?",
            [rows[0].checkInPhoto, record.id],
          );
        }
        assert.equal(
          (
            await request(
              `/api/attendance?employeeId=${employee.user.id}`,
              other.cookie,
            )
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request(`/api/attendance/${record.id}`, hr.cookie, "PATCH", {
              workDate: "2026-01-01",
            })
          ).response.status,
          404,
        );
      },
    );
    await t.test(
      "concurrent check-outs complete the day once and filters paginate correctly",
      async () => {
        const results = await Promise.all(
          [1, 2, 3].map(() =>
            request(
              "/api/attendance/check-out",
              employee.cookie,
              "POST",
              upload(),
            ),
          ),
        );
        assert.deepEqual(
          results.map((result) => result.response.status).sort(),
          [201, 409, 409],
        );
        const completed = results.find(
          (result) => result.response.status === 201,
        )!.data as AttendanceRecord;
        assert.equal(completed.status, "Completed");
        assert.ok(
          Date.parse(completed.checkOutAt!) >= Date.parse(record.checkInAt),
        );
        cleanupFiles.push(
          (
            await attendanceDb.query(
              "SELECT checkOutPhoto FROM attendance WHERE id = ?",
              [record.id],
            )
          )[0].checkOutPhoto,
        );
        const filtered = await request(
          `/api/attendance?employeeId=${employee.user.id}&status=Completed&from=${workDate()}&to=${workDate()}&pageSize=1`,
          hr.cookie,
        );
        assert.equal(filtered.data.total, 1);
        assert.equal(filtered.data.items.length, 1);
        assert.equal(
          (await request("/api/attendance?from=2026-02-30", hr.cookie)).response
            .status,
          400,
        );
        assert.equal(
          (
            await request(
              "/api/attendance?from=2026-10-02&to=2026-10-01",
              hr.cookie,
            )
          ).response.status,
          400,
        );
      },
    );
    await t.test(
      "a prior open day is incomplete and cannot be checked out today",
      async () => {
        const yesterday = workDate(new Date(Date.now() - 86400000));
        await attendanceDb.query(
          "INSERT INTO attendance (id, employeeId, employeeCode, fullName, department, workDate, checkInAt, checkInPhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            randomUUID(),
            other.user.id,
            other.user.employeeCode,
            other.user.fullName,
            other.user.department,
            yesterday,
            new Date(Date.now() - 86400000),
            "test-only-missing.jpg",
          ],
        );
        const history = await request(
          `/api/attendance?employeeId=${other.user.id}&status=Incomplete`,
          hr.cookie,
        );
        assert.equal(history.data.total, 1);
        assert.equal(history.data.items[0].status, "Incomplete");
        assert.equal(
          (
            await request(
              "/api/attendance/check-out",
              other.cookie,
              "POST",
              upload(),
            )
          ).response.status,
          400,
        );
        const started = await request(
          "/api/attendance/check-in",
          other.cookie,
          "POST",
          upload(),
        );
        assert.equal(started.response.status, 201);
        cleanupFiles.push(
          (
            await attendanceDb.query(
              "SELECT checkInPhoto FROM attendance WHERE id = ?",
              [started.data.id],
            )
          )[0].checkInPhoto,
        );
      },
    );
    await t.test(
      "deactivation preserves history, reactivation works, and password reset revokes sessions",
      async () => {
        const removed = await request(
          `/api/employees/${employee.user.id}`,
          hr.cookie,
          "DELETE",
        );
        assert.equal(removed.response.status, 200);
        assert.equal(removed.data.active, false);
        assert.equal(
          (await request("/api/auth/me", employee.cookie)).response.status,
          401,
        );
        assert.equal(
          (await request("/api/attendance", employee.cookie)).response.status,
          401,
        );
        assert.equal(
          (
            await request("/api/auth/login", "", "POST", {
              email: employee.user.email,
              password,
            })
          ).response.status,
          401,
        );
        assert.equal(
          (await request(record.checkInPhoto, hr.cookie)).response.status,
          200,
        );
        assert.equal(
          (
            await request(
              `/api/attendance?employeeId=${employee.user.id}`,
              hr.cookie,
            )
          ).data.total,
          1,
        );
        assert.equal(
          (
            await request(
              `/api/employees/${employee.user.id}`,
              hr.cookie,
              "PATCH",
              { status: "active" },
            )
          ).response.status,
          200,
        );
        employee = await login(employee.user.email, password);
        assert.equal(
          (
            await request(
              `/api/employees/${employee.user.id}`,
              hr.cookie,
              "PATCH",
              { password: "ChangedPass123!" },
            )
          ).response.status,
          200,
        );
        assert.equal(
          (await request("/api/auth/me", employee.cookie)).response.status,
          401,
        );
        employee = await login(employee.user.email, "ChangedPass123!");
        const token = employee.cookie.split("=")[1];
        const hash = createHash("sha256").update(token).digest("hex");
        assert.notEqual(
          token,
          (
            await identityDb.query(
              "SELECT tokenHash FROM sessions WHERE employeeId = ?",
              [employee.user.id],
            )
          )[0].tokenHash,
        );
        await identityDb.query(
          "UPDATE sessions SET expiresAt = ? WHERE tokenHash = ?",
          [new Date(Date.now() - 1000), hash],
        );
        assert.equal(
          (await request("/api/auth/me", employee.cookie)).response.status,
          401,
        );
        assert.equal(
          (await request("/api/auth/logout", other.cookie, "POST")).response
            .status,
          201,
        );
        assert.equal(
          (await request("/api/auth/me", other.cookie)).response.status,
          401,
        );
      },
    );
    await t.test(
      "database ownership is isolated and identity outages fail closed",
      async () => {
        await assert.rejects(
          () => identityDb.query("SELECT * FROM attendance_db.attendance"),
          /denied/i,
        );
        await assert.rejects(
          () => attendanceDb.query("SELECT * FROM identity_db.employees"),
          /denied/i,
        );
        const listener = createServer();
        await new Promise<void>((resolve) =>
          listener.listen(0, "127.0.0.1", resolve),
        );
        const port = (listener.address() as { port: number }).port;
        await new Promise<void>((resolve) => listener.close(() => resolve()));
        const child = spawn(process.execPath, ["dist/main.js"], {
          cwd: resolve("apps/attendance"),
          env: {
            ...process.env,
            ATTENDANCE_PORT: String(port),
            IDENTITY_URL: "http://127.0.0.1:1",
          },
          stdio: "ignore",
        });
        try {
          let ready = false;
          for (let i = 0; i < 50; i++) {
            try {
              ready = (
                await fetch(`http://127.0.0.1:${port}/api/attendance/health`)
              ).ok;
            } catch {
              // The health endpoint may not be ready yet.
            }
            if (ready) {
              break;
            }
            await delay(100);
          }
          assert.equal(
            ready,
            true,
            "Outage-test service must start. Build the attendance service first.",
          );
          const unavailable = await fetch(
            `http://127.0.0.1:${port}/api/attendance`,
            { headers: { Cookie: hr.cookie } },
          );
          assert.equal(unavailable.status, 503);
          assert.match(
            ((await unavailable.json()) as { message: string }).message,
            /Identity service/,
          );
        } finally {
          child.kill("SIGTERM");
        }
        if (localDirectory) {
          assert.equal(
            (await readdir(localDirectory)).filter(
              (name) => !initialFiles.includes(name),
            ).length,
            cleanupFiles.length,
            "Only successful attendance photos remain.",
          );
        }
      },
    );
    await t.test("login attempts are rate-limited", async () => {
      const results = [];
      for (let i = 0; i < 11; i++) {
        results.push(
          (
            await request("/api/auth/login", "", "POST", {
              email: "missing@wfh.test",
              password: "wrong-password",
            })
          ).response.status,
        );
      }
      assert.ok(results.includes(429));
    });
  } finally {
    for (const id of ids) {
      const photos = await attendanceDb.query(
        "SELECT checkInPhoto, checkOutPhoto FROM attendance WHERE employeeId = ?",
        [id],
      );
      for (const row of photos) {
        cleanupFiles.push(row.checkInPhoto, row.checkOutPhoto);
      }
      await attendanceDb.query("DELETE FROM attendance WHERE employeeId = ?", [
        id,
      ]);
      await identityDb.query("DELETE FROM sessions WHERE employeeId = ?", [id]);
      await identityDb.query("DELETE FROM employees WHERE id = ?", [id]);
    }
    await removeTestPhotos(cleanupFiles);
    await identityDb.destroy();
    await attendanceDb.destroy();
  }
});
