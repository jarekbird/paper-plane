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
Jarek merges; no agent merges on its own.

Not set up: a merge queue (t3-g2's `.mergify.yml` is not ported) and branch protection. Until they are, nothing but
this page keeps an unchecked commit off `main`.

## Shipping

Not set up: t3-g2's skill `ship` and its scripts are not ported. Nothing is packed for or uploaded to the Even Hub
by CI or by an agent. Telegram's app id is injected at pack time and never committed (S3), so packing waits for that
step to be designed.

## The Worker

`worker/` is not built. CI never deploys it and never reaches it; its deployment gets a section here when it exists.
