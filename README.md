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

Migrations are stored in `drizzle/`. No seed data is provided, so an empty database remains empty until sourced records are explicitly imported. University, requirement, scholarship, deadline, contact, and evidence records retain source references and verification states. Database-backed profile and application API reads require an authenticated student context; that identity layer is not part of this foundation. Local mock profile/application API responses are labeled `MOCK`.

Available read-only API routes:

- `/api/universities`
- `/api/universities/[slug]`
- `/api/scholarships`
- `/api/profile`
- `/api/applications`
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
