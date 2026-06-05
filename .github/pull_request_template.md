## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Linked work
- Plan / issue: <!-- link -->
- Related repos: <!-- link any PRs that depend on or are depended on by this one -->

## Quality gates
- [ ] `lint` passes locally
- [ ] `test` passes locally
- [ ] Coverage ≥ ADR-001 80% floor (or justified exception below)
- [ ] `typecheck` / `build` passes (where applicable)
- [ ] Docs updated (`README.md`, `DEVELOPER.md`, `AGENTS.md`, repo memory)
- [ ] Migration added (if schema change) — forward-only, expand/contract
- [ ] QA PII scrub updated (if migration adds PII)
- [ ] Release doc set updated (if release contract changed)

## Security
- [ ] No secrets in code, logs, error messages, or test fixtures
- [ ] No raw API keys forwarded to downstream services
- [ ] No PII added to telemetry or access logs

## Deployment notes
<!-- e.g. "Requires migration run before service rollout", "Requires xynes-platform-contracts vX.Y.Z first". -->

## Rollback plan
<!-- For risky changes only. -->

---

## Repo-specific items (xynes-doc-service)

This is a **Bun + Hono + Drizzle** service. Use `bun`, never `npm`.

- [ ] Lint: `bun run lint` (eslint over `src/**/*.{ts,tsx}` — note: lints `src/` only per repo convention; `tests/` is intentionally out of scope)
- [ ] Tests: `bun run test` (unit suite; default env file `.env.dev` via `scripts/run-with-env.ts`)
- [ ] Integration tests (when touching DB-bound code): `bun run test:integration`
- [ ] Coverage: `bun run test:coverage` (unit) / `bun run test:integration:coverage` (full) — overall must stay at or above the **ADR-001 80% lines + branches floor**
- [ ] Typecheck: `bun x tsc --noEmit` — zero new errors vs the target branch baseline (verify with `git stash` round-trip if pre-existing errors exist)
- [ ] If touching `src/infra/db/schema.ts`: add the matching forward-only Drizzle migration under `drizzle/` (per `drizzle.config.ts` `out`). Run `bun run migrate` against a local DB to verify replay-safety. The `docs` schema is owned by this service (per `xynes-infra/docs/DATABASE.md` §3); avoid touching `platform.*` / `identity.*` / `authz.*` / `cms.*` tables — they are owned by `xynes-infra` / `xynes-authz-service` / `xynes-cms-core` respectively.
- [ ] **Actor-aware handlers (PFU-1 + CMS-API-KEY-ACTOR-1 Story A parity).** Internal route MUST parse `X-XS-Actor-Type` / `X-XS-User-Id` / `X-XS-API-Key-Id` / `X-XS-API-Key-Prefix` and build a discriminated `ActionActor = UserActor | ApiKeyActor` context. `src/middleware/authz-check.ts` MUST short-circuit when `ctx.actor?.kind === 'api_key'` — the gateway has already scope-checked the route's action key. Write handlers that record audit ownership MUST use `requireUserActor(ctx)` or `getOptionalUserId(ctx)` per the in-preset / out-of-preset distinction; doc audit columns (`created_by` / `updated_by`) MUST be nullable so api_key actors leave them `NULL`.
- [ ] **Closed-set error codes only.** Provider / postgres / Drizzle / authz-client error text MUST NOT propagate into envelope `error.message` or `error.details`. New error paths land as additions to the existing closed-set unions — never a free-form string.
- [ ] If adding a new gateway-reachable action: open the matching `xynes-infra/supabase/migrations/20251229100001_seed_platform_routes.sql` route seed PR (action endpoint must be `/internal/doc-actions`) AND the `xynes-authz-service` permission catalog PR in lockstep. Merge order: contracts/authz first, then this PR. Action keys MUST follow the `docs.<domain>.<verb>` pattern.
- [ ] No raw credentials in any test fixture or handler. No `xynes_live_*` / `AKIA*` / `re_*` / `X-Amz-Signature` substrings anywhere — gateway redaction is the last line, not the only line.
