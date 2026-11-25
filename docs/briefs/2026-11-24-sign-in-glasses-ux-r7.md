# Glasses UX review, round 7: paper-plane sign-in

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head b92d41c. Diff: git diff 711e875..b92d41c.
Round 6 was at cdffc25; what changed since: git diff cdffc25..b92d41c -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then docs/briefs/2026-11-24-sign-in-loop.md.
Jarek allowed five more rounds on 2026-11-25 (this is the second of them).

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
Author's checks at head: npm run check, 259 tests passed. Earlier rounds' fixes: rounds 1 to 5 as in the earlier
briefs beside this one. Round 6, Architecture F1 and Security F1 (after a sign-out Telegram could not be told of,
the authenticated client and its updates loop stayed alive):
- `AuthClientLike` has `drop()`. src/telegram/client.ts now hands the adapters one object that passes every call
  on to the current mtcute client; `drop` takes the listeners off the old client, makes a new one, puts them on it,
  and destroys the old one. The app's lifetime still destroys whichever is current at the end.
- `signOut` in src/telegram/account.ts: Telegram ended the session: "told"; not ended but forgotten on the phone:
  drop the client, "untold"; neither: it rejects and the user stays signed in. `forget` (the undo of a sign-in)
  drops the client the same way when the session was removed but could not be ended.
- Tests: "A4: drops the signed-in connection when sign-out could not tell Telegram", "keeps the connection, now
  signed out, when Telegram ended the session itself", "A4: drops the signed-in connection when an undone sign-in
  could not be ended at Telegram". src/telegram/client.ts itself has no unit test: it is wiring over the real
  library, checked by the compiler against mtcute's types and not yet run against Telegram.

Known and not in this change: the real sign-in has never run (no app id yet). The build WITH an app id does not
pass the store check (docs/roadmap.md). What the glasses say when a signed-in session dies while the app runs is
roadmap item 15. The session string is stored as text in the Even app's storage and the web view's. Out of reach by
design: storage and network failing at every step at once.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
