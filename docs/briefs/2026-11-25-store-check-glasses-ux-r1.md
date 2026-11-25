# Glasses UX review, round 1: paper-plane store check

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-store, branch store-check, base main ec71381, head 9c98ae1 (the commit above it adds only these briefs). Diff: git diff ec71381..9c98ae1.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. The folders dist and dist-telegram
in the worktree are the author's builds at head: read them, do not rebuild them.
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is for: a build with Telegram in it (an app id in .env.local) failed Earshot's store check, because
the Telegram library (mtcute) names link formats (t.me, tg://) and its web transport puts its socket address
together while the app runs. Even's store review refuses a bundle naming an address outside app.json's whitelist.
What it does:
- src/telegram/transport.ts: the app's own transport for mtcute. Five fixed socket addresses, one per Telegram data
  centre; an unknown data centre throws. The socket itself is opened by @fuman/net's connectWs with the web view's
  WebSocket, the same call mtcute's own web transport makes; it ends when the client is dropped or destroyed
  (src/telegram/client.ts, unchanged in that respect).
- src/telegram/options.ts and client.ts: the client is built from @mtcute/core (BaseTelegramClient + TelegramClient)
  with the web crypto and platform of @mtcute/web, so mtcute's own web transport is not in the bundle.
- vite.config.ts: a build step rewrites two web links the library carries ('https://t.me/' and the made-up base
  'https://fake/' it parses links with). The app never prints or parses a Telegram link.
- scripts/store-check.mjs: Earshot's check with the list NOT_DESTINATIONS (what the library only reads or prints,
  each with its reason). npm run check builds and checks both builds: dist (no app id) and dist-telegram (made-up id).
- CLAUDE.md rule S2 reworded; Jarek approved the rewording by card on 2026-11-24.
Tests: src/telegram/transport.test.ts, scripts/store-check.test.mjs, scripts/ci.test.mjs.
Scope: the whole diff, but docs/briefs/2026-11-24-sign-in-*-r8.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 268 tests passed; both builds pass the store check. In Even's simulator the
new transport reached Telegram's test servers and a sign-in code was asked for (before the last edit, which only
dropped an option whose default is the same WebSocket).

Known and not in this change: the real sign-in has never run (no app id yet). Whether Even's own review objects to
the tg:// strings is unknown; Earshot's check is the nearest stand-in. The dev server does not run the build step.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
