# Security and privacy review, round 4: paper-plane sign-in

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head 8861a21. Diff: git diff 711e875..8861a21.
Round 3 was at 180ea0e; what changed since: git diff 180ea0e..8861a21 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

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
Author's checks at head: npm run check, 249 tests passed. Earlier rounds' fixes: rounds 1 and 2 as in the earlier
briefs beside this one. Round 3:
- Architecture F1 and Glasses UX F1 (a retry that found the sign-in revoked left the glasses on "Cannot reach
  Telegram"): `SignIn.retry` now tells the app the outcome whenever Telegram answered, signed in or not; the app
  shows the sample chats for "not". `SignIn.start(kept)` says "Your Telegram sign-in has ended. Sign in again." on
  the phone when a sign-in was kept and Telegram no longer knows it. Tests in src/phone/signin.test.ts and
  src/app.test.ts ("goes to the sample chats when a tap on try again gets through ...").
- Security F1 (a failure after the code was accepted left a usable session saved): `entered` in
  src/telegram/account.ts wraps export, storing and starting updates; on any failure it removes what was stored,
  logs the session out (`forget`) and reports "Could not reach Telegram". Tests: "leaves nobody signed in when
  ... fails after Telegram took the code".

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
