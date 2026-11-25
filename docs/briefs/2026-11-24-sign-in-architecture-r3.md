# Architecture review, round 3: paper-plane sign-in

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head 180ea0e. Diff: git diff 711e875..180ea0e.
Round 2 was at 0bad6e5; what changed since: git diff 0bad6e5..180ea0e -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit.
Run the app with skill `simulator` in a run folder under /tmp, then stop it: the page `#account=sample` has a
Telegram section on the phone page that signs in to a sample account (any number of eight digits or more, code
12345); the sample account's list on the glasses is now titled "Sample chats". The simulator driver cannot type
into the phone page, so the steps themselves are for the tests and the code; say what you could and could not
drive. Other reviewers share the simulator and dev-server ports. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-park-and-like-*-r8.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 243 tests passed. Earlier rounds' fixes: round 1 as in the round-2 brief
beside this one. Round 2:
- Glasses UX F1 (a failed restore silently put sample chats in a returning user's place): src/app.ts has a fourth
  state, offline: `startWaiting` draws "Cannot reach Telegram" with "Tap to try again" (an action, so the menu and
  voice have it too); the tap shows "Connecting…" and retries. Sample chats follow a kept sign-in only when
  Telegram says that sign-in is gone, and the sample list is titled "Sample chats". Tests: the two "offline" cases
  in src/app.test.ts.
- Architecture F1 (cancelling during exportSession still saved the session): `entered` in src/telegram/account.ts
  checks the signal after export, after storing and after starting updates; when aborted it removes what was
  stored and logs the session out (`forget`). Tests: three deferred cases in src/telegram/account.test.ts.
- Security F1 (removal counted when one of the two storage copies accepted it): src/store.ts removes the session
  from each place on its own and rejects unless all did (`storeOver`); src/store.test.ts covers a copy that could
  not be cleared. `signOut` then answers: forgotten and Telegram told: "told"; forgotten, Telegram not reached:
  "untold"; not forgotten but Telegram ended the session: "told" (the copy left is dead); neither: it rejects and
  the user stays signed in and is told so.

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
