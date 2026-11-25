# Security and privacy review, round 2: paper-plane pack

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-pack, branch pack-beta, base main 3a28aa9, head 7f3cfe9 (the commit above it adds only these briefs). Diff: git diff 3a28aa9..7f3cfe9 -- . ':!docs/briefs'.
Round 1 was at 7381b48; what changed since: git diff 7381b48..7f3cfe9 -- scripts (one fix, below).
Read CLAUDE.md, docs/architecture.md, docs/test-map.md and docs/ci.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds,
packs or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any
outside service, and run no `evenhub` command that reaches the Even Hub (create, upload, promote, ls, login).
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: the first step of roadmap item 17 (submission): a build can be packed for the Even Hub.
- scripts/pack.mjs (`npm run pack`): `vite build` into build/pack, the store check (scripts/store-check.mjs) on that
  very folder, then `evenhub pack app.json build/pack -o build/paper-plane.ehpk`. Its last line says whether the
  pack has Telegram and voice in it, from Vite's own `loadEnv('production', …)`, the same reading the build does
  (names, never values). build/ and *.ehpk are ignored by Git.
- scripts/pack.test.mjs: that report, on folders made for the test.
- docs/ci.md: "Shipping" (by hand, from Tower, only on Jarek's word; the steps) and "The Worker" (deployed by hand;
  where its key lives). Nothing uploads on its own.
Author's checks at head: npm run check, 346 tests passed; a trial `npm run pack` without .env.local wrote a 155 kB
pack and said "Telegram NOT in (sample chats only), voice NOT set up". Nothing was uploaded.

Round 1: Security and privacy approve, Glasses UX approve, Architecture changes needed, one finding:
- Architecture F1 (the report read .env.local with its own parser: a quoted empty value counted as set, and the
  production files and expansion were unknown to it): `parts(folder)` now asks Vite's `loadEnv`. Tests cover quoted
  empty values, a production file overriding, and expansion.

Known and not in this change: no version bump, no automatic shipping, no tag. The pack was not installed on glasses.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
