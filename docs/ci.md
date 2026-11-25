# CI

`.github/workflows/check.yml` runs on every push and every pull request, on any branch, with a read-only token and
no secret:

- **check** on `ubuntu-latest`: `npm ci`, then `npm run check` (its steps: `docs/test-map.md`).

The job has no `if:`, so a skipped job can never stand in for a tested one, and it has a time limit
(`scripts/ci.test.mjs` checks both). The checks call no outside service: no Telegram, no Google, no Worker.

There is no `sim` job: the repository has no simulator test config yet (`docs/test-map.md`, Not covered yet). Add
the job and the config in one change.

## Merging

A pull request is ready when `check` is green on its head commit and skill `review-loop` approved that commit.
Merging, for the hackathon week (Jarek, 2026-11-23: "I merge after review"): the author merges its own pull request
once every focus of skill `review-loop` has approved and CI `check` is green on the head commit. A change to a rule in
`CLAUDE.md` still needs Jarek's OK first.

Not set up: a merge queue (t3-g2's `.mergify.yml` is not ported) and branch protection. Until they are, nothing but
this page keeps an unchecked commit off `main`.

## Shipping

By hand, from Tower, and only when Jarek says "ship": nothing is uploaded to the Even Hub by CI or by an agent on its
own. `evenhub` is signed in on Tower only.

1. In a clean checkout of `origin/main`, with `.env.local` holding `VITE_RELAY` and, once there is one, Telegram's
   app id (`VITE_TELEGRAM_API_ID`, `VITE_TELEGRAM_API_HASH`; never committed, S3): `npm ci`, `npm run check`.
2. Set the next version in `app.json` and `package.json`.
3. `npm run pack`: builds, runs the store check on that very build, and writes `build/paper-plane.ehpk`. Its last
   line says whether the pack has Telegram and voice in it.
4. The first time, `npx evenhub create build/paper-plane.ehpk --name "Paper Plane" --tagline "<one line>"` makes the
   app on the Even Hub. After that, `npx evenhub upload build/paper-plane.ehpk -m "<what is new>"`. Then
   `npx evenhub promote <version> --to beta`.
5. Tag `v<version>` on the commit and push the tag.

## The Worker

`worker/` is Earshot's relay as the Cloudflare Worker `paper-plane-relay`. CI never deploys it and never reaches
it. It is deployed by hand from a clean checkout of `origin/main`: `npx wrangler deploy --config
worker/wrangler.toml`, with the Cloudflare token in the environment; the OpenRouter key is its secret
`OPENROUTER_KEY` and is nowhere else (S3).
