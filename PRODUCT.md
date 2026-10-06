# Product requirements

WFH Attendance supports employees recording their workday remotely and HR administrators maintaining employee accounts and monitoring attendance.

## Employee workflow

Employees sign in with an HR-created account, submit a check-in photo, and submit a check-out photo on the same WIB date. Both actions record server timestamps. Employees can view their own attendance history and evidence.

## HR workflow

HR administrators create and update employee profiles, deactivate/reactivate accounts, and reset passwords. Deactivation preserves historical attendance and revokes sessions. HR can filter and view attendance and photos, but cannot modify attendance records or submit attendance as an employee.

## Rules and boundaries

- One daily record per employee, with one check-in and one check-out.
- Evidence must be a valid JPEG, PNG, or WebP image, at most 5 MB.
- Store timestamps in UTC; derive work dates and display times in Asia/Jakarta.
- Prior unclosed days become Incomplete; historical records remain immutable.
- Accounts are created by HR; HR administrator accounts are seeded.
- No public registration, approvals, payroll, GPS, facial recognition, or lateness policy.

The interface and documentation use English. Desktop and mobile layouts retain accessible labels, keyboard navigation, visible focus, and explicit loading/error/empty states. The requirement-to-test mapping is in [REQUIREMENTS.md](REQUIREMENTS.md).
