import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { DataSource } from "typeorm";
import sharp from "sharp";
import "@wfh/common";

// This check deliberately restarts this project's Docker services. It preserves demo accounts/data.
const exec = promisify(execFile);
const base = "http://localhost:8080";
const identityDb = new DataSource({
  type: "mysql",
  url:
    process.env.IDENTITY_DATABASE_URL ||
    "mysql://identity:identity_local@127.0.0.1:3307/identity_db",
});
const attendanceDb = new DataSource({
  type: "mysql",
  url:
    process.env.ATTENDANCE_DATABASE_URL ||
    "mysql://attendance:attendance_local@127.0.0.1:3307/attendance_db",
});
let cookie = "";
let employeeId = "";
let filenames: string[];

async function call(path: string, method = "GET", body?: object | FormData) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      Origin: base,
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${await (!response.ok ? response.text() : Promise.resolve(""))}`,
  );

  return response;
}

try {
  const admin = await call("/api/auth/login", "POST", {
    email: "hr@wfh.test",
    password: process.env.DEMO_PASSWORD || "DemoPass123!",
  });
  cookie = admin.headers.get("set-cookie")!.split(";")[0];
  const suffix = randomUUID().slice(0, 8);
  const email = `restart-${suffix}@wfh.test`;
  const password = "RestartPass123!";
  const created = await (
    await call("/api/employees", "POST", {
      employeeCode: `RESTART-${suffix}`,
      fullName: "Persistence Test Employee",
      email,
      password,
      department: "Verification",
      jobTitle: "Test Account",
    })
  ).json();
  employeeId = created.id;
  const login = await call("/api/auth/login", "POST", { email, password });
  cookie = login.headers.get("set-cookie")!.split(";")[0];
  const photo = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#147d70" },
  })
    .png()
    .toBuffer();
  const upload = () => {
    const form = new FormData();
    form.append(
      "photo",
      new Blob([new Uint8Array(photo)], { type: "image/png" }),
      "persistence-test.png",
    );

    return form;
  };
  const record = await (
    await call("/api/attendance/check-in", "POST", upload())
  ).json();
  const before = Buffer.from(
    await (await call(record.checkInPhoto)).arrayBuffer(),
  );
  await exec(
    "docker",
    ["compose", "restart", "mysql", "identity", "attendance"],
    { timeout: 60000 },
  );
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      ready =
        (await fetch(`${base}/api/identity/health`)).ok &&
        (await fetch(`${base}/api/attendance/health`)).ok;
    } catch {
      // The health endpoint may not be ready yet.
    }
    if (ready) {
      break;
    }
    await delay(500);
  }
  assert.equal(ready, true, "Services must recover after restart.");
  const user = await (await call("/api/auth/me")).json();
  assert.equal(
    user.id,
    employeeId,
    "Database-backed cookie session survives restart.",
  );
  const history = await (await call("/api/attendance")).json();
  assert.equal(
    history.items[0].id,
    record.id,
    "Attendance record survives restart.",
  );
  const after = Buffer.from(
    await (await call(record.checkInPhoto)).arrayBuffer(),
  );
  assert.equal(
    createHash("sha256").update(before).digest("hex"),
    createHash("sha256").update(after).digest("hex"),
    "Persistent photo bytes survive restart.",
  );
  const completed = await (
    await call("/api/attendance/check-out", "POST", upload())
  ).json();
  assert.equal(completed.status, "Completed");
  console.log(
    "Persistence check passed: MySQL, sessions, attendance and photos survive container restarts; checkout still works.",
  );
} finally {
  if (employeeId) {
    await identityDb.initialize();
    await attendanceDb.initialize();
    try {
      const rows = await attendanceDb.query(
        "SELECT checkInPhoto, checkOutPhoto FROM attendance WHERE employeeId = ?",
        [employeeId],
      );
      filenames = rows
        .flatMap((row: { checkInPhoto: string; checkOutPhoto: string }) => [
          row.checkInPhoto,
          row.checkOutPhoto,
        ])
        .filter(Boolean);
      await attendanceDb.query("DELETE FROM attendance WHERE employeeId = ?", [
        employeeId,
      ]);
      await identityDb.query("DELETE FROM sessions WHERE employeeId = ?", [
        employeeId,
      ]);
      await identityDb.query("DELETE FROM employees WHERE id = ?", [
        employeeId,
      ]);
    } finally {
      await identityDb.destroy();
      await attendanceDb.destroy();
    }
    if (filenames.length) {
      await exec("docker", [
        "compose",
        "exec",
        "-T",
        "attendance",
        "node",
        "-e",
        `const fs=require('node:fs'); for(const name of process.argv.slice(1)) { if(/^[a-f0-9-]{36}\\.jpg$/.test(name)) try {fs.unlinkSync('/data/uploads/'+name)} catch(e) {if(e.code!=='ENOENT') throw e} }`,
        ...filenames,
      ]);
    }
  }
}
