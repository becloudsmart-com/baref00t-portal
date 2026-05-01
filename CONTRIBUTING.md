# Contributing

Thank you for your interest in `@baref00t/partner-portal`.

## How this repo is maintained

This is the **public mirror** of the source held in the private `becloudsmart-com/baref00t` monorepo. Every release tag (`portal-vX.Y.Z`) overwrites this repo's main branch with a clean orphan commit exported from upstream — no private commit metadata leaks here, and contributor PRs against the mirror are **advisory** rather than directly merged.

### What that means for PRs

- 👍 **PRs welcome** — they're the best way to suggest concrete changes.
- ⚠️ **They will be force-overwritten on the next release.** We re-author your change in the upstream private repo (with attribution) before the next mirror cycle.
- ✅ **Your contribution is preserved** — just via re-commit, not via direct merge.

## Issues

File issues at https://github.com/becloudsmart-com/baref00t-portal/issues. Bug reports, feature requests, doc corrections all welcome.

For security issues — **do not** open a public issue. Email security@baref00t.io.

## Local development

```bash
git clone https://github.com/becloudsmart-com/baref00t-portal.git
cd baref00t-portal
pnpm install
cp .env.example .env
# Edit .env — at minimum set BAREF00T_API_KEY, AUTH_SECRET, AUTH_URL,
# AZURE_AD_*, BRAND_*. See docs/ENV-REFERENCE.md.
pnpm dev
# Portal at http://localhost:3001
```

## Code conventions

- TypeScript strict mode, zod for runtime validation, Tailwind v4 for styles
- All env vars validated in `src/env.ts` — add new ones there + document in `docs/ENV-REFERENCE.md`
- Server actions in `_actions.ts` next to the page that uses them; never expose the SDK client to client components
- All UI components in `src/components/ui/` are presentation-only (no auth or fetching logic)

## Commit convention

Conventional commits: `<type>(<scope>): <subject>`. Examples:

```
feat(customers): add CSV bulk import
fix(api-keys): pre-flight check before slot 1 revocation
docs(deploy): document Vercel deployment
chore: bump @baref00t/sdk to 0.2.0
```

## Releases

Maintainers tag `portal-vX.Y.Z` upstream → the [publish workflow](.github/workflows/publish-portal.yml) builds + pushes to GHCR → the [mirror workflow](.github/workflows/mirror-portal.yml) overwrites this public repo + cuts a GitHub release here.
