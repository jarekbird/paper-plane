# Glasses UX review, round 6: paper-plane sign-in

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head cdffc25. Diff: git diff 711e875..cdffc25.
Round 5 was at 482957f; what changed since: git diff 482957f..cdffc25 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then docs/briefs/2026-11-24-sign-in-loop.md: it
says what five rounds found and what the design now is. Jarek allowed five more rounds on 2026-11-25.

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
Author's checks at head: npm run check, 256 tests passed. Earlier rounds' fixes: rounds 1 to 4 as in the earlier
briefs beside this one. Round 5:
- Security F1 (leaving, then a failing step, skipped the undo): `entered` in src/telegram/account.ts now has one
  exit for anything but a clean finish. It runs export, store and start-listening, noting whether a session was
  stored and whether a step failed; then, if the user left or a step failed, it calls `forget` and answers: the
  sign-in is gone and the user left: the abort; gone and a step failed: "Could not reach Telegram"; not gone and a
  session was stored: the signed-in user, which the phone shows with the sign-out button. Test: "A5: undoes the
  sign-in when the user leaves and the step that was running then fails".
- Architecture F1 (a user returned by sendCode was dropped): `Account.askCode` answers "code" or the signed-in
  user; the adapter runs `entered` for the latter; the sample account answers "code"; the phone model goes
  straight to signed in. Tests: the contract's code step, "signs the user in when Telegram needs no code for this
  number", and "is signed in straight after the number when Telegram asks for no code".

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's. Out of reach by
design: storage and network failing at every step at once.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
