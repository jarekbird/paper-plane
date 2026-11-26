# Glasses UX review, round 1: paper-plane trouble

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above 7821022 (it adds
only these briefs). Diff: git diff 06d6a1a..7821022.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any simulator run folder of yours under
/tmp. No whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Run the app with skill `simulator` on a free port of 127.0.0.1 (not 5183 or 5197), use the changed features before
reading the code, then stop every process you started. Other reviewers share this machine, and the simulator
sometimes cannot start beside another one: if it does not, say so and review from the tests and the code.
Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
- src/messenger.ts: `Trouble` (`unreachable`, or `wait` with seconds) and `TroubleError`; `Account.onEnded`.
- src/telegram/trouble.ts: which of Telegram's answers mean "signed out" and "wait"; `answerWithin`, the
  fifteen-second limit on a call.
- src/telegram/messenger.ts: every call goes through `ask`: none is made once the connection has been gone three
  seconds, each is given up after fifteen, a given-up send is aborted so the library takes it out of its line, an
  answer that means "signed out" is reported to the account with the sign-in the call was made under. Listeners
  are told when the connection is lost and when it is back.
- src/telegram/account.ts: a count of sign-ins (`era`), so a late answer cannot end a newer sign-in; `ended`
  forgets the stored sign-in, drops the connection and tells listeners; restoring at launch and asking for a code
  have the fifteen-second limit.
- src/demo: the sample messenger and account stage the same trouble; src/demo/trouble.ts and `#trouble=` in
  src/launch.ts stage it in the simulator, on sample chats only.
- src/trouble.ts: the words. src/inbox.ts, src/glasses/app.ts: the list title, the chat body and every "could
  not" notice say what is wrong. src/phone/signin.ts, src/app.ts: an ended sign-in goes to the sample chats with a
  card on the glasses and the sign-in form on the phone.

Look hardest at: the words (C5) and whether each fits its place on 576 x 288: the list title, the chat body, the
notice card; what the user can still do on each trouble screen and whether touch, menu and voice agree (A7); a
reply that could not go out (does the screen say the right thing, is the retry one tap); the moment a sign-in
ends (card, then sample chats) and the phone page. Run `#trouble=unreachable`, `#trouble=wait` and
`#account=sample&trouble=ended` (README, "Run it"): trouble starts 8 s after launch and ends at 30 s.

The cases the author went through, and what should happen in each:
- Launch with no connection: "Cannot reach Telegram / Tap to try again" after fifteen seconds (was: "Connecting to
  Telegram…" for good).
- Connection lost on the list: the title says "Cannot reach Telegram" within fifteen seconds; the chats stay.
- Connection lost in a chat: the body says so; the messages come back by themselves.
- Send, like, save, keep, undo, mark read while it is gone: at once after three seconds of loss, else after
  fifteen; a card says why; a reply stays with "Not sent. Tap to try again" and goes out once by a tap.
- Telegram asks to wait (after the library's own short waits): the card says how long, rounded up.
- Sign-in ended elsewhere, noticed on any call: stored sign-in removed, connection replaced, phone page shows the
  sign-in form with "Your Telegram sign-in has ended", glasses show a card and the sample chats; a reply waiting
  for its tap is gone with the session.
- A late "signed out" answer after the user signed out here, or signed in again: ignored.
- A late answer to a call that was given up: ignored.

Known, and said in the pull request: none of this has run on Telegram; the error names and connection states are
the ones mtcute 0.32.8 has in node_modules. A send given up after fifteen seconds on a connection that is slow
rather than gone may already have reached Telegram, and the retry would then send it twice; the library offers no
way to tell. Giving a code or a password still has no time limit: those steps have "Use another number".

Author's checks at 7821022: npm run check, 440 tests passed. Simulator: the three `#trouble=` runs, screenshots in
.sim/trouble of the worktree.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
