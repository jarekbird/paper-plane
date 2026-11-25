# Architecture review, round 1: paper-plane sign-in

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-signin, branch sign-in, base main 711e875, head 060b152. Diff: git diff 711e875..060b152.
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
Author's checks at head: npm run check, 220 tests passed. Earlier rounds' fixes: none.

What changed (roadmap item 1):
- src/messenger.ts: `Account` (restore, askCode, giveCode, givePassword, signOut) and `SignInError` with a plain
  problem word. src/account.contract.ts is its contract, run against src/demo/account.ts and against
  src/telegram/account.ts over a stand-in client.
- src/telegram/account.ts: sign-in over a small client interface; Telegram's errors become problem words; the
  session string goes to a `SessionPlace` (src/store.ts, key telegram-session); every await goes through the app's
  lifetime. src/telegram/client.ts only builds the real client and hands out `{ account, messenger }`.
- src/phone/signin.ts: the steps as a model (checking, offline, phone, code, password, in), one answer at a time,
  a stale answer ignored. src/phone/page.ts draws it; inputs are a tel field, a one-time-code field and a password
  field, and every text is set as textContent.
- src/app.ts: which account is on show. A switch ends the old account's lifetime (its Inbox, glasses screens and
  phone page) and starts the other; picks are kept per account (`picks:sample`, `picks:telegram`).
- src/main.ts: Telegram is in the build only when VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH are set
  (.env.local, not committed); the import of the Telegram client is then the only path to it. `#account=sample`
  offers the sample sign-in instead.
- app.json: a network permission for wss://*.web.telegram.org.

Decisions made on purpose: until sign-in the glasses show the sample account (judges have no account to use);
sign-out forgets the session on the phone first and says so if Telegram could not be told; no QR sign-in.

Known and not in this change: the real sign-in has never run (no app id yet), so everything about Telegram here
is proven against stand-ins only. The build WITH an app id does not pass the store check: the Telegram library
names link formats and builds its socket address at run time (docs/roadmap.md, "Before the Telegram build can
ship"). What the glasses say when a signed-in session dies while the app runs is roadmap item 15.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
