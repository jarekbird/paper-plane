# Glasses UX review, round 2: paper-plane sign-in

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head 0bad6e5. Diff: git diff 711e875..0bad6e5.
Round 1 was at 060b152; what changed since: git diff 060b152..0bad6e5 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit.
Run the app with skill `simulator` in a run folder under /tmp, then stop it: the page `#account=sample` has a
Telegram section on the phone page that signs in to a sample account (any number of eight digits or more, code
12345). The simulator driver cannot type into the phone page, so the steps themselves are for the tests and the
code; say what you could and could not drive. Other reviewers share the simulator and dev-server ports.
Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-park-and-like-*-r8.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 235 tests passed. Earlier rounds' fixes:
- Glasses UX F1 and Architecture F2 (nothing was drawn until restore answered): src/app.ts asks the account only
  whether a sign-in is kept on the phone (`known`, no network), then draws at once: `wait()` shows "Connecting to
  Telegram…" on the glasses (`startWaiting`) and the phone for a returning user, `show(null)` the sample chats for a
  new one. `restore` then runs in the background and shows the user's own account, or the sample one if the sign-in
  turned out gone. Tests: "at launch, while Telegram has not answered yet".
- Architecture F1 (an abandoned attempt still saved its session): `Account` methods take an AbortSignal; the phone
  model aborts the attempt in `another()`; src/telegram/account.ts, when the signal is aborted by the time Telegram
  accepts, logs that session out again and saves nothing. Tests: the contract's "A5: signs nobody in for an attempt
  the user has left", and the adapter's deferred case.
- Security F1 (any sign-out error read as "signed out on this phone"): `signOut` rejects when the session could
  not be removed (the model then stays signed in and says so) and answers "told" or "untold" for Telegram. Tests in
  src/telegram/account.test.ts and src/phone/signin.test.ts.
- Security F2 (all Telegram users shared one set of picks): `Account` answers who signed in (`Who`: id and name);
  picks are stored under `picks:telegram:<id>`. Test: "S1: gives a second user of the same phone none of the first
  user's picks".
- Security F3 (`#trace` printed real chats to the console): src/launch.ts decides the flags; trace is on only when
  the user's own Telegram cannot be on the glasses. Test: src/launch.test.ts.

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
