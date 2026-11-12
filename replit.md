# CPF Dance

Dance teaching schedule platform for one instructor (Courtney) and her dancers. Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind v4.

**Read [CLAUDE.md](CLAUDE.md) before changing anything.** It holds the architecture, the auth rules, the critical gotchas, and the new-feature checklist. Design decisions come from [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md).

## User Preferences

Preferred communication style: Simple, everyday language.

## Replit specifics

- `npm run dev` serves on port 3434 and `.replit` waits on it. `npm start` serves on port 5000, which maps to external port 80.
- Gmail and Google Calendar go through Replit Connectors (`google-mail`, `google-calendar`) via `@replit/connectors-sdk`. Never hand-fetch OAuth tokens. Details: [docs/google-integrations.md](docs/google-integrations.md).
- Installing packages here writes `package-firewall.replit.internal` URLs into `package-lock.json`. CI rewrites them before `npm ci`, so leave them alone.
- Deployments cache hard. If a change doesn't show in production, delete the deployment and create a fresh one.
- Database changes are numbered SQL files in `migrations/`, run by hand in the Supabase SQL editor. See [migrations/README.md](migrations/README.md).
- Roles are `instructor`, `dancer`, `guardian` and `admin`. There are no studio roles in the app.
