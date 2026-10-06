import { test } from "node:test";
import assert from "node:assert/strict";
import { workDate, attendanceStatus } from "@wfh/contracts";
import {
  hashPassword,
  verifyPassword,
} from "../apps/identity/src/auth/password";

test("WIB date rolls over at 17:00 UTC, independently of host timezone", () => {
  assert.equal(workDate(new Date("2026-10-02T16:59:59.999Z")), "2026-10-02");
  assert.equal(workDate(new Date("2026-10-02T17:00:00.000Z")), "2026-10-03");
  assert.equal(workDate(new Date("2026-12-31T17:00:00.000Z")), "2027-01-01");
});
test("open prior days become incomplete; current open days stay working", () => {
  assert.equal(
    attendanceStatus("2026-10-01", null, "2026-10-02"),
    "Incomplete",
  );
  assert.equal(attendanceStatus("2026-10-02", null, "2026-10-02"), "Working");
  assert.equal(
    attendanceStatus("2026-10-01", new Date(), "2026-10-02"),
    "Completed",
  );
});
test("passwords use salted hashes and reject incorrect passwords", async () => {
  const hash = await hashPassword("DemoPass123!");
  assert.notEqual(hash, await hashPassword("DemoPass123!"));
  assert.equal(await verifyPassword("DemoPass123!", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword("DemoPass123!", "invalid"), false);
});
