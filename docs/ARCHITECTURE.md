# Architecture and request routing

The application contains a React/TypeScript frontend, two independently running NestJS HTTP services, and MySQL 8.4. Both services use TypeORM migrations and own separate database credentials. Shared contracts contain framework-independent types and WIB helpers; backend runtime utilities remain in the common package.

## Development

```text
Browser: React at http://localhost:5173
  → Vite development server
      /api/attendance → http://127.0.0.1:3002 (attendance)
      other /api     → http://127.0.0.1:3001 (identity)
```

Frontend requests use relative `/api/...` URLs. Vite's proxy runs on the developer machine, where both NestJS processes listen. Its loopback targets are development settings and are not embedded as production API addresses. Local MySQL is available through port 3307.

## Docker and production

```text
Browser: React, using the public app origin
  → TLS reverse proxy (production only, e.g. Traefik)
  → Nginx web container
      /api/attendance → attendance:3002
      other /api/    → identity:3001
      other paths    → static React assets / SPA fallback
```

Vite builds the production assets but its development server does not run in the deployed frontend container. Nginx handles production API routing. Docker DNS resolves service names within the private Compose network. The local Docker demo exposes Nginx at http://localhost:8080 without the external TLS proxy.

All browser API calls share the frontend origin, simplifying cookie authentication. Login creates a random 12-hour session token in an HttpOnly cookie; only its hash is stored in identity's database. Production cookies are Secure. Mutations validate the browser origin; sessions and role guards protect the endpoints.

## Service and data ownership

- Identity owns employee profiles, password hashes, roles, active status, and sessions in `identity_db`.
- Attendance owns daily records, employee snapshots, server timestamps, and photo references in `attendance_db`.
- Both logical databases live in one MySQL container. Separate database users/grants prevent cross-service database access; there is no cross-service foreign key.
- Attendance forwards the session cookie to identity's `GET /api/auth/me` for every protected request, including photos. A 2.5-second timeout bounds this call. Invalid/inactive sessions are rejected; unavailable or malformed identity responses fail closed with 503.
- Attendance stores decoded evidence in its persistent upload volume. Owner/HR authorization is required to retrieve photos through the API; Nginx does not expose the upload directory.
- Timestamps are stored in UTC; work dates and displayed times use Asia/Jakarta. One record per employee/WIB date is enforced by a database constraint, and checkout uses a conditional update.

## Deployment management

Dokploy is an optional management layer outside employee and HR request paths. It manages Compose deployments and Traefik routing through Docker. Its platform database is separate from the application's MySQL schemas. Backend and database services remain private; only the public reverse proxy needs internet ingress.

See [README](../README.md) for setup/API examples, [requirements](../REQUIREMENTS.md) for coverage, and [production deployment](../DEPLOYMENT.md) for reusable configuration.
