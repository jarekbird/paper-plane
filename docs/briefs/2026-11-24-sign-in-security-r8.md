# Security and privacy review, round 8: paper-plane sign-in

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head 9792a10. Diff: git diff 711e875..9792a10.
Round 7 was at b92d41c; what changed since: git diff b92d41c..9792a10 -- src (two small changes, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then docs/briefs/2026-11-24-sign-in-loop.md.
Jarek allowed five more rounds on 2026-11-25 (this is the third of them).

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit.
Run the app with skill `simulator` in a run folder under /tmp, then stop it: the page `#account=sample` has a
Telegram section on the phone page that signs in to a sample account (any number of eight digits or more, code
12345); the sample account's list on the glasses is titled "Sample chats". The simulator driver cannot type into
the phone page, so the steps themselves are for the tests and the code; say what you could and could not drive.
Other reviewers share the simulator and dev-server ports. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-park-and-like-*-r8.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 263 tests passed. Earlier rounds' fixes: rounds 1 to 6 as in the earlier
briefs beside this one. Round 7:
- Security F1 (mtcute's default WARN logging can print a decoded response): src/telegram/options.ts builds the
  options of every client, with `logLevel: LogManager.OFF`; src/telegram/client.ts makes clients only through it.
  Test: src/telegram/options.test.ts.
- Architecture F1 (a queued inbox refresh ran after its session ended): src/inbox.ts keeps its lifetime; `refresh`
  does nothing once it has ended, and `#load` asks through `life.guard`, so a late answer changes and tells
  nothing. Tests: src/inbox.test.ts.

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's. Out of reach by
design: storage and network failing at every step at once.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
