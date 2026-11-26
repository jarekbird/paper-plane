# Security and privacy review, round 4: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above e9ffcc8 (it adds
only these briefs). Diff: git diff 809cdaf..e9ffcc8.
Round 3 was at 321ce4b; what changed since: git diff 321ce4b..e9ffcc8 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, no Google, and not the relay at paper-plane-relay.jarekbird.workers.dev. Run no `wrangler` or `evenhub`
command. Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one
targeted test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its
check if feasible). Please report everything in your focus that you would hold the merge for now, not one finding
a round.

Scope: the whole diff. Do not start the simulator: your focus is the code.

What the change is: roadmap 10, "Telegram + Calendar". The round-1 brief beside this one lists the parts and the
cases the author went through; the briefs of rounds 2 and 3 list the earlier findings and fixes.

Round 3 (at 321ce4b): all three changes needed. What was found, and what changed:
- Architecture F1 and Security F1 (a calendar object outlived its Google account: a confirmed "Send and add" whose
  message was still going out, or an undo, could reach the account connected meanwhile): a calendar is bound to a
  sign-in when it is made. `calendarOver` reads the account's sign-in once (`account.signIn()`) and asks for its key
  by it (`account.token(of, signal)`), which ends with `GoogleEnded` for any other sign-in. src/app.ts takes a
  calendar anew on every change of the Google sign-in (`calendars.own.calendar()` in `book`), also when one account
  replaces another at once. The reply screen and the undo keep the calendar they were made with, so both fail
  closed: "Sent. Could not add it to the calendar", or "Message taken back. The meeting is still in the calendar".
  Tests: src/google/calendar.test.ts "A5: belongs to the Google account it was made under…" (remove, add and next
  after another account was connected: no request to Google, the meeting stays where it was) and "works for the
  account connected now when it is made anew"; src/google/account.test.ts "A5: gives a key only for the sign-in it is
  asked about"; src/app.test.ts "A5: takes a calendar anew whenever the Google sign-in changes…".
- Glasses UX F1 (after a disconnect the reply screen still showed the meeting line and "Menu: Send and add"): the
  line, the foot and the action hang on one condition (`offering` in the reply screen). Test:
  src/glasses/calendar.test.ts "keeps a reply that was waiting for its tap when the calendar is disconnected…"
  now holds the whole frame.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found.

Author's checks at e9ffcc8: npm run check, 691 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
