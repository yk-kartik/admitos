# AdmitOS

AdmitOS is an AI-powered workspace for international university admissions, scholarships, transfer pathways, and application preparation.

## Current Scope

- Dashboard, profile, university directory and detail pages, scholarships, pathways, applications, and an application copilot.
- University records and the repository-backed evidence retriever are local mock data. University requirements, dates, scholarships, contacts, and source URLs are unavailable unless explicitly represented in a sourced record.
- Only current `verified` evidence can support authoritative decisions. Mock, unverified, stale, conflicting, or missing evidence requires review.
- The JEV and language-generation providers are mock implementations. The application copilot creates a local draft only; it does not connect to application portals or submit applications.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
node --experimental-strip-types --test services/application-copilot.test.mjs
```

## Persistence Foundation

The persistence layer uses Drizzle ORM with PostgreSQL (`postgres` driver). The application does not require a database to start: when `DATABASE_URL` is unset, read-only catalog APIs use repository-backed mock data and return `dataSource: "MOCK"`. A configured database is reported as `DATABASE`; connection/query failures return an unavailable response instead of silently substituting mock data.

To generate or apply migrations, configure `DATABASE_URL` in the process environment (do not commit credentials), then run:

```bash
npm run db:generate
npm run db:migrate
```

Migrations are stored in `drizzle/`. No seed data is provided, so an empty database remains empty until sourced records are explicitly imported. University, requirement, scholarship, deadline, contact, and evidence records retain source references and verification states.

Database-backed profile and copilot access requires an authenticated Better Auth session. Profile ownership comes from the server-side session identity; legacy profile rows remain unowned until explicitly associated and are never assigned to a new account automatically. The editable profile API accepts only supported profile fields and ignores client-supplied identity and ownership fields. Without PostgreSQL or `BETTER_AUTH_SECRET`, persistent authentication is unavailable and private profile routes fail closed; public catalog mock data remains explicitly non-authoritative.

Authentication requires PostgreSQL and `BETTER_AUTH_SECRET` in the process environment. In GitHub Codespaces, the auth server derives its canonical origin as `https://${CODESPACE_NAME}-${PORT:-3000}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}` and trusts that exact HTTPS origin. During non-production development it also trusts only `http://localhost:${PORT:-3000}`, which supports the local forwarded app origin. No `BETTER_AUTH_URL` secret is needed in Codespaces when those standard environment variables are available.

For deployments outside Codespaces, configure the non-secret `BETTER_AUTH_URL` environment variable to the exact public application origin, including scheme and host but no path, for example `https://admitos.example.com`. Production auth remains unavailable without this explicit origin. Never set a wildcard or arbitrary trusted origin, and do not commit `BETTER_AUTH_SECRET` or database credentials.

Generate and apply the additive identity/profile migration with:

```bash
npm run db:generate
npm run db:migrate
```

The Better Auth route is `/api/auth/[...all]`; profile reads and updates use `/api/profile` with the authenticated session cookie. Existing mock data does not create users or substitute for private persisted profile data.

Available API routes:

- `/api/universities`
- `/api/universities/[slug]`
- `/api/scholarships`
- `/api/profile` (authenticated GET and PUT)
- `/api/applications`
- `/api/applications/[id]` (authenticated PATCH)
- `/api/applications/[id]/copilot`

## Routes

- `/` - Dashboard
- `/ai-advisor` - AI Advisor workspace
- `/universities` - University directory
- `/universities/[slug]` - University profile, provenance, and source status
- `/scholarships` - Scholarship workspace
- `/pathways` - Transfer pathway planner
- `/applications` - Application tracker
- `/application-copilot` - JEV-first application preparation and review
- `/profile` - Student profile workspace
