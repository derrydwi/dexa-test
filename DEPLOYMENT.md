# Production deployment

The default `compose.yaml` and its credentials are for local evaluation only. `compose.production.yaml` is a reusable production template with private backend/database ports and persistent MySQL/photo volumes. It uses prebuilt local images and requires a TLS reverse proxy connected to the web service's Docker network.

## Build and configure

Build the images sequentially on the deployment host. The frontend disables local credential shortcuts in this build:

```sh
docker build -f infra/Dockerfile.api --build-arg SERVICE=identity -t wfh-identity:production .
docker build -f infra/Dockerfile.api --build-arg SERVICE=attendance -t wfh-attendance:production .
docker build -f infra/Dockerfile.web --build-arg VITE_DEMO_MODE=false -t wfh-web:production .
cp .env.production.example .env.production
```

Replace all environment placeholders. Generate separate hexadecimal identity/attendance database passwords with `openssl rand -hex 32`; the initialization script validates that format. Use a unique root password and initial account password. `APP_ORIGIN` must equal the public HTTPS origin with no trailing slash. Both backends already enable Secure cookies in the production template.

`MYSQL_INIT_SCRIPT` identifies `infra/init.production.sh` on the Docker host. Its default relative path works when Compose is run from the source checkout. If a platform stores the Compose file elsewhere, set this variable to the script's absolute host path. The script creates two databases with separate credentials and grants on the first MySQL initialization; editing its environment later does not rotate existing database passwords.

Keep production environment files and secrets outside version control. Supply values through the deployment platform's private environment settings or an untracked `.env.production` file.

## Route public traffic

Create a DNS A record for the chosen domain/subdomain pointing to the deployment host. Terminate HTTPS at a reverse proxy such as Traefik and route all paths to Compose service `web`, container port `80`. Nginx serves the React assets and forwards `/api/attendance` to `attendance:3002`, and other `/api/` requests to `identity:3001`. Backend and database ports do not need public mappings.

For Dokploy, import the production template as a **Docker Compose** deployment, keep **Isolated Deployments** enabled, and configure a domain with service `web`, port `80`, path `/`, HTTPS enabled, and a Let's Encrypt certificate. Supply the required environment values and the initialization-script host path. The locally built image tags must exist on the same deployment host because the template uses `pull_policy: never`. Click **Deploy** after changing images or runtime configuration. Dokploy manages routing; application requests do not pass through its dashboard.

If deploying manually, configure the reverse proxy/network first, then start the template:

```sh
docker compose --env-file .env.production -f compose.production.yaml up -d
```

Migrations run before each backend starts. Seed explicitly after identity becomes healthy:

```sh
docker compose --env-file .env.production -f compose.production.yaml exec identity node dist/database/seed.js
```

The seeded account addresses are the same as the local demo, but production passwords come from `INITIAL_ACCOUNT_PASSWORD`. Existing account passwords are preserved by repeated seeding. Share live evaluation credentials separately; do not commit them.

## Updates and verification

Update the source, rebuild affected images, and redeploy using the same Compose project, environment settings, and volumes. Shared-package changes can require rebuilding multiple images. Domain-only changes require updating routing and `APP_ORIGIN`, then recreating the services; no image rebuild is needed.

Preserve database and photo volumes. Avoid **Fresh Volumes** and `down -v` during routine updates. Single-host updates can briefly interrupt availability; no rolling deployment or scheduled backup system is included.

Verify both public readiness endpoints, login/logout, role access, and the changed workflow. Replace the example hostname with your own:

```sh
curl -fsS https://attendance.example.com/api/identity/health
curl -fsS https://attendance.example.com/api/attendance/health
```

This template does not configure the host firewall, operating system, reverse proxy installation, or administrator access. Keep internal services private and configure those controls through the chosen hosting platform.
