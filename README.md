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
