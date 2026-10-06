# WFH Attendance & HR Monitoring

A runnable fullstack skill-test app built with React + TypeScript, two independent NestJS HTTP services, and MySQL 8.4. The interface and documentation are in English.

Live demo: **[wfh.derrydwi.tech](https://wfh.derrydwi.tech)**

## Test Accounts

The following accounts can be used to test the live demo:

| Role / Account             | Email               | Password                           |
| -------------------------- | ------------------- | ---------------------------------- |
| Employee                   | `employee@wfh.test` | `qlYwSsHNoXQDtfQcPAa_hmHBU3z792Px` |
| HR                         | `hr@wfh.test`       | `qlYwSsHNoXQDtfQcPAa_hmHBU3z792Px` |
| Employee / Additional User | `sam@wfh.test`      | `qlYwSsHNoXQDtfQcPAa_hmHBU3z792Px` |

These accounts are intended for demonstration and testing purposes only.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for service boundaries and request routing, [REQUIREMENTS.md](REQUIREMENTS.md) for requirement coverage, and [DEPLOYMENT.md](DEPLOYMENT.md) for generic production setup.

## Run with Docker

Prerequisites: Docker Engine/Desktop or OrbStack, with Docker Compose. Start the container runtime first.

```sh
docker compose up --build -d
docker compose exec identity node dist/database/seed.js
```

Open **http://localhost:8080**. Migrations run before each API starts. The seed is explicit and repeatable: existing accounts and passwords are preserved.

| Role             | Email             | Default password |
| ---------------- | ----------------- | ---------------- |
| HR administrator | hr@wfh.test       | DemoPass123!     |
| Employee         | employee@wfh.test | DemoPass123!     |
| Second employee  | sam@wfh.test      | DemoPass123!     |

Demo buttons fill the default credentials; they do not sign in automatically. If you customize `DEMO_PASSWORD` on the initial seed, enter it manually. Docker seed override: `docker compose exec -e DEMO_PASSWORD=YourNewDemoPassword identity node dist/database/seed.js`.

```sh
docker compose logs -f identity attendance
docker compose stop                  # preserves data and photos
docker compose up -d                 # resumes the demo
```

Database and photo volumes persist across container restarts. `docker compose down` also preserves them. Removing volumes deletes the demo data and photos; do so only when deliberately resetting the environment.

## Run Node services during development

Prerequisites: Node.js 22.12+ and npm. MySQL runs in Docker; TypeScript compilation is used for Nest's decorator metadata.

```sh
cp .env.example .env
npm ci
docker compose up -d mysql
npm run build
npm run migrate
npm run seed
npm run dev
```

Open **http://localhost:5173**. Identity runs on 3001 and attendance on 3002. Vite proxies requests to both services so cookies remain same-origin. The root `.env` is loaded by both APIs. `UPLOAD_DIR` is relative to the repository root unless absolute.

Run either the Docker APIs or the native APIs at a time: they use the same host ports. If switching to Node development, `docker compose stop web attendance identity` first. If switching to Docker, stop `npm run dev` first.

## Workflows

**Employee:** sign in, select a work photo, confirm check-in, and repeat with another photo for check-out. View previous records and their evidence in Attendance history.

**HR:** add employees with a unique employee code and email; edit their profile or reset their password; deactivate/reactivate access. Filter attendance by employee, WIB dates, and status. HR attendance is strictly view-only.

Both submissions require real JPEG, PNG or WebP content, up to 5 MB and 25 megapixels. Images are decoded, normalized to a JPEG up to 2560×2560 and stripped of metadata. Photos are served through authorized API endpoints, never through a public upload directory.

One record is allowed per employee per WIB date. The backend supplies all times. Check-out must occur on the same WIB date as check-in; checkout without a current-day check-in is rejected. Old open records appear as **Incomplete**, while a new workday may still be started. Completed and incomplete records cannot be edited. All timestamps are stored in UTC and displayed in Western Indonesia Time (`Asia/Jakarta`, UTC+7).

Deactivation invalidates sessions and preserves historical attendance and evidence. Password resets also invalidate sessions. Employee codes and emails stay reserved for inactive accounts; reactivate the existing account rather than reusing its identity.

## Architecture and database structure

See the [architecture explanation](docs/ARCHITECTURE.md) for development and production proxy routes, private services, storage, and deployment management.

```text
Browser (React)
       │ same-origin /api requests
       ▼
Nginx (Docker) / Vite proxy (development)
       ├─ /api/auth, /api/employees, /api/identity → Identity service
       │                                          └─ identity_db
       │                                             ├─ employees
       │                                             └─ sessions → employees (FK)
       └─ /api/attendance → Attendance service
                             ├─ attendance_db.attendance
                             ├─ protected photo volume
                             └─ HTTP GET identity /api/auth/me
```

Each service has its own database user. Identity cannot read attendance tables, and attendance cannot read identity tables. HTTP authentication is checked on every attendance request with a 2.5-second timeout; identity outages fail closed with HTTP 503. Nginx refreshes backend addresses through Docker DNS so service restarts recover without restarting the frontend. There is no shared database access or cross-service foreign key. Attendance stores employee ID plus employee code, name and department **as they were at check-in**, so later profile edits do not rewrite historical evidence.

- `employees`: UUID primary key; unique employee code and email; profile fields; scrypt password hash; HR/EMPLOYEE role; active flag; UTC creation/update timestamps.
- `sessions`: SHA-256 token hash primary key, employee foreign key and expiry index. The random token itself exists only in the HttpOnly cookie. Sessions last 12 hours.
- `attendance`: UUID primary key, employee reference/snapshot, WIB work date, UTC timestamps and generated photo filenames. Unique `(employeeId, workDate)` and a checkout-after-checkin constraint.
- TypeORM migrations create both schemas; `synchronize` is disabled. Migrations are tracked independently in each database.

Directory layout: `apps/web`, `apps/identity`, `apps/attendance`, `packages/contracts` (public types and WIB helpers), `packages/common` (backend bootstrap, guards, configuration and response DTOs), `infra` (containers/proxy/MySQL initialization), and `tests`.

## API documentation

| Documentation           | Docker URL                                     |
| ----------------------- | ---------------------------------------------- |
| Identity Swagger        | http://localhost:8080/api/identity/docs        |
| Attendance Swagger      | http://localhost:8080/api/attendance/docs      |
| Identity OpenAPI JSON   | http://localhost:8080/api/identity/docs-json   |
| Attendance OpenAPI JSON | http://localhost:8080/api/attendance/docs-json |

Use port 5173 instead of 8080 during Node development. Swagger uses the same session cookie after login in the app.

| Method | Endpoint                             | Access / behavior                                                                    |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------ |
| POST   | /api/auth/login                      | Email/password; sets 12-hour HttpOnly session cookie                                 |
| POST   | /api/auth/logout                     | Revokes current session and clears cookie                                            |
| GET    | /api/auth/me                         | Current active user                                                                  |
| GET    | /api/employees                       | HR; `q`, `status=active/inactive/all`, `page`, `pageSize`                            |
| POST   | /api/employees                       | HR; creates employee account                                                         |
| GET    | /api/employees/:id                   | HR; employee details                                                                 |
| PATCH  | /api/employees/:id                   | HR; profile/password or `status=active/inactive`                                     |
| DELETE | /api/employees/:id                   | HR; deactivates, preserving history                                                  |
| POST   | /api/attendance/check-in             | Employee; multipart field `photo`                                                    |
| POST   | /api/attendance/check-out            | Employee; multipart field `photo`                                                    |
| GET    | /api/attendance                      | Own records, or all for HR; `employeeId`, `from`, `to`, `status`, `page`, `pageSize` |
| GET    | /api/attendance/:id/photos/check-in  | Owner or HR; protected JPEG                                                          |
| GET    | /api/attendance/:id/photos/check-out | Owner or HR; protected JPEG                                                          |
| GET    | /api/identity/health                 | Identity database readiness                                                          |
| GET    | /api/attendance/health               | Attendance database readiness                                                        |

Lists return `{ items, total, page, pageSize }`; page size defaults to 20 and is capped at 100. Attendance statuses are `Working`, `Completed`, or `Incomplete`. Submitted records return protected photo URLs. Validation errors return `{ statusCode, message, timestamp }`; messages may be a string or a list of field errors. Invalid input is 400, unauthenticated 401, unauthorized 403, missing 404, duplicate 409, oversized photo 413, throttled login 429, and unavailable identity 503.

```sh
curl -c /tmp/wfh.cookies -H 'Content-Type: application/json' \
  -d '{"email":"employee@wfh.test","password":"DemoPass123!"}' \
  http://localhost:8080/api/auth/login
curl -b /tmp/wfh.cookies -F 'photo=@/absolute/path/work.jpg' \
  http://localhost:8080/api/attendance/check-in
curl -b /tmp/wfh.cookies http://localhost:8080/api/attendance
```

## Verification

Tests run on the host and require Node.js 22.12+, `npm ci`, and `npm run build`, including when testing Docker APIs.

With native services running:

```sh
npm run verify
TEST_UPLOAD_DIR="$PWD/uploads" npm run test:integration
npx playwright install chromium firefox webkit   # once, if not already installed
# Wait 60 seconds after the integration suite, which verifies login throttling.
TEST_UPLOAD_DIR="$PWD/uploads" npm run test:browser
# Wait 60 seconds or restart identity before the next authentication-heavy suite.
TEST_WEB_URL=http://localhost:5173 npm run test:browser:smoke
```

Against Docker APIs, run the same type/build/unit checks and use:

```sh
TEST_DOCKER=1 TEST_BASE_URL=http://localhost:8080 TEST_ORIGIN=http://localhost:8080 npm run test:integration
docker compose restart identity && docker compose up -d --wait identity # reset test-consumed login limits
npm run test:persistence # deliberately restarts this project’s Docker services
TEST_DOCKER=1 TEST_WEB_URL=http://localhost:8080 npm run test:browser
docker compose restart identity && docker compose up -d --wait identity
TEST_WEB_URL=http://localhost:8080 npm run test:browser:smoke
```

Integration checks cover real MySQL CRUD, role restrictions, session expiry/logout/reset/deactivation, fake and oversized images, photo privacy, concurrent submissions, historical-day rules, filtering/pagination, database isolation, identity failures, and login throttling. They create dedicated accounts and remove their database records. Native tests also verify failed-upload cleanup; `TEST_DOCKER=1` removes the test photos from the dedicated Docker volume after test account cleanup. The throttling check consumes the local login limit; allow 60 seconds before running browser checks or restart the identity service between suites.

Browser checks exercise HR create/edit/deactivate/reactivate, employee check-in/out, photo viewing, history, selected employee preservation during search, pending-dialog protection, midnight evidence reset, error recovery, mobile navigation and focus restoration, and desktop/mobile widths. Screenshots are written to `artifacts/browser/` (ignored by Git). Tests require seeded HR credentials; override `DEMO_PASSWORD` when customized.

Submission verification on 4 October 2026: lint and formatting, all workspace type checks and production builds, ten focused tests, fresh-volume Docker startup/migrations and repeatable seeding, eight real-MySQL integration scenarios, and Chromium desktop/mobile workflows passed. Firefox/WebKit smoke checks cover keyboard controls, forms, focus restoration, photo reset, and WCAG A/AA scans. The keyboard smoke explicitly waits for a stable, focused Select trigger after viewport changes. MySQL readiness uses TCP so its temporary initialization server cannot start the backends prematurely.

Viewports are emulated; physical devices and manual screen-reader testing were not covered. Firefox/WebKit attendance reads use fixtures; real submissions run in Chromium and the API integration suite. Restart/photo persistence was verified during the original implementation; the submission cleanup did not change that behavior. Production hosting was not redeployed as part of these submission checks. Vite reports upstream Zod comment-annotation warnings, with successful production builds.

## Local-demo defaults and limits

The default Compose configuration is a local skill-test demo. Ports in this configuration bind to localhost; production requires the separate configuration described in DEPLOYMENT.md. Database credentials in Compose and `infra/init.sql` are demo-only values. Browser mutations validate `APP_ORIGIN`, reject cross-site requests, and use a SameSite cookie; non-browser API clients may omit Origin. Use the exact configured host (`localhost`, not `127.0.0.1`) for browser access. Enable `COOKIE_SECURE=true`, TLS and deployment-specific secrets before hosting publicly.

The Docker identity service trusts one proxy hop, with Nginx overwriting the client IP header. Keep API ports private when adapting this demo for hosting. Login throttling is process-local (10 attempts per minute per source IP); multi-instance deployments need shared throttling storage. Backend containers restart after transient startup failures, including MySQL being unavailable during a simultaneous restart. Photos use a local persistent volume; multi-host deployments would need shared object storage. Failed inserts and conditional updates remove their new photo files, but process termination between a file write and a database write can leave an orphan file. No registration, approval, payroll, GPS, facial recognition, overnight checkout, or lateness policy is included.

## Source organization and maintenance

The services use Nest feature modules with controllers for HTTP concerns, services for business operations, DTO validation at the boundary, and TypeORM repositories. Session and role guards protect routes before uploads are processed. Employee/session changes remain transactional; attendance retains database uniqueness and conditional checkout updates.

```text
apps/identity/src/
  main.ts, app.module.ts
  auth/          # sessions, authentication, password hashing, guard
  employees/     # employee controller/service, DTOs, entity, presenter
  health/
  config/
  database/      # data source, unchanged migrations, seed, migration runner
apps/attendance/src/
  main.ts, app.module.ts
  attendance/    # attendance controller/service, DTOs, entity, presenter
  identity-client/
  photos/
  health/
  config/
  database/
apps/web/src/
  app/           # routes, session-aware app entry, layout/navigation
  features/      # auth, employees, attendance: pages, forms, schemas, API/query hooks
  components/    # reusable presentation and owned shadcn/ui source in ui/
  hooks/         # debounced search and WIB work date
  lib/           # HTTP transport, QueryClient/session boundary, formatting, class names
  styles/        # Impeccable semantic tokens and layout rules
packages/contracts/  # framework-independent public types and WIB helpers
packages/common/     # backend bootstrap, guards, configuration, response DTOs
```

The web workspace has no Nest runtime dependency. Its private contracts workspace exposes framework-independent TypeScript source to browser bundlers and compiled CommonJS to the services. The shadcn/ui components are owned source and use Radix primitives, with Tailwind CSS 4 and the existing Impeccable tokens. Status filters use Radix Select, and employee filtering uses the official Popover + Command composition. Native date/file functionality remains within shared input controls. Login, employee and evidence forms use React Hook Form with feature-owned Zod schemas and inline server errors. Server validation is authoritative, and validation responses include optional `fieldErrors` for inline feedback while preserving `statusCode`, `message`, and `timestamp`.

Run `npm run verify` for lint, formatting, all type checks, production builds, and focused tests. The focused HTTP timeout test opens a temporary localhost listener. Run the real-MySQL, browser, and restart checks separately against the demo. The requirement-to-test mapping is in [REQUIREMENTS.md](REQUIREMENTS.md). Use `npm run format` before submitting changes.

`npm run format` applies ESLint fixes, then Prettier. `npm run lint:fix` applies only ESLint fixes; `npm run lint` and `npm run format:check` check without editing. Keep double quotes, semicolons, trailing commas, two-space indentation, and Prettier's default line width. ESLint requires braces around control-flow bodies, blank lines after import blocks and around functions/classes/exports, before returns, and between class members. Class, method, and property decorators each occupy their own line; parameter decorators may remain inline. Keep each DTO's decorators attached to its property, with a blank line before the next property group.

Inside frontend components and hooks, group state, refs, other hooks, derived values, const arrow handlers, effects, and rendering with blank lines. Keep prerequisite values before their consumers, hooks unconditional, and effects in their existing relative order. Retain named component and module-level function declarations. Grouping is maintained during code review; formatting does not sort imports or reorder hooks.

Existing migration class names and SQL definitions are preserved; this refactor requires no database reset. Relative `UPLOAD_DIR` values resolve from the workspace root, including when starting from an application's directory. Existing password hashes and session tokens remain valid.

TanStack Query owns server state. Feature query keys include the signed-in user and filter parameters; requests consume Query's AbortSignal. Reads stay fresh for 15 seconds, inactive results expire after five minutes, and focus/reconnect revalidate stale results. Only network/server read failures retry once; mutations and authentication failures do not retry. Employee changes invalidate directory/picker queries, attendance submissions invalidate attendance queries, and WIB rollover refreshes historical statuses and resets current-day evidence. Logout/session changes cancel requests, remove protected caches, and discard late responses. Queries are never persisted to browser storage.

The image decoder uses patched sharp 0.35.5+. A root js-yaml 5.4.2 override patches Swagger's pinned transitive dependency; remove the override when Swagger adopts a patched YAML version.
