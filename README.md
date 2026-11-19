# Thúlio Silva — Portfolio

Minimal professional portfolio built with Next.js, TypeScript, Tailwind CSS, and
MDX. The first release contains a homepage and a provisional case study for M3
Nexus.

## Local development

Requirements:

- Node.js 20.9 or newer
- npm

```bash
npm install
cp .env.example .env.local
# Replace PORTFOLIO_PASSWORD and AUTH_SECRET in .env.local.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Content before publishing

1. Review every placeholder in `src/app/projects/m3-nexus/page.mdx`.
2. Confirm the M3 Nexus copy against contractual and confidentiality
   obligations.
3. Add a production domain to metadata and generate a sitemap after the final
   URL is known.

## Private preview access

The preview is protected on the server by a shared password. Set these variables
locally in `.env.local` and in the Vercel project's environment settings:

- `PORTFOLIO_AUTH_ENABLED=true`
- `PORTFOLIO_PASSWORD`: a strong password shared only with reviewers
- `AUTH_SECRET`: a separate random value of at least 32 characters
- `PORTFOLIO_PUBLIC=false`

The access cookie is `HttpOnly`, `SameSite=Strict`, secure in production, and
expires after seven days. Changing either `PORTFOLIO_PASSWORD` or `AUTH_SECRET`
invalidates existing sessions.

When the site is approved for public release, set
`PORTFOLIO_AUTH_ENABLED=false` and `PORTFOLIO_PUBLIC=true`, then redeploy.

Do not add proprietary source code, screenshots, diagrams, customer data,
credentials, internal documentation, data models, or business rules.

## Deploying to Vercel

After the repository is reviewed and published:

1. Import the Git repository in Vercel.
2. Keep **Next.js** as the detected framework preset.
3. Keep the default build command (`npm run build`) and output settings.
4. Add the private preview environment variables listed above.
5. Deploy, review the preview URL, then attach the approved production domain.

No database, user accounts, or external authentication service are required.
