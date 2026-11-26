# Security and privacy review, round 3: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 321ce4b (it adds
only these briefs). Diff: git diff 809cdaf..321ce4b.
Round 2 was at 84a4b4d; what changed since: git diff 84a4b4d..321ce4b -- src.
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
cases the author went through; the round-2 brief lists round 1's findings and fixes.

Round 2 (at 84a4b4d): all three changes needed. What was found, and what changed:
- Architecture F1 and Security F1 (a retry could take the key of an account connected meanwhile, and `drop()` could
  forget that account): a key now carries its sign-in (`GoogleKey` in src/google/account.ts). `refused(key)` ends
  with `GoogleEnded` when the sign-in has changed, and `drop(key)` forgets only that sign-in. Tests:
  src/google/calendar.test.ts "A5: when the user connects another Google account while … is on its way" (the first
  answer held, and the answer to the second try held); src/google/account.test.ts "A5: gives no key of a new sign-in
  to a call that began under the one before it…".
- Architecture F2 (undo's calendar call ran under the app's signal): `Calendar.remove(meeting, signal)`; the chat
  screen passes its own signal; the Google calendar checks the signal before every request. Tests: the calendar
  contract "A4: takes nothing back for a caller that has already gone" (both calendars); src/google/calendar.test.ts
  "A4: asks Google to take nothing back for a caller that left while the key was being fetched";
  src/glasses/calendar.test.ts "A4: takes no meeting back once the chat was left…".
- Glasses UX F1 (relative dates were counted from the moment of the reply): the time is read against the message's
  own time (`heard.at`), and offered only if it is still ahead. Tests: src/glasses/calendar.test.ts "counts
  'tomorrow' from the day the message was sent…", "offers no meeting for a time that has passed since…".
- Glasses UX F2 (connecting or disconnecting Google restarted the session and lost a reply in the making): src/app.ts
  no longer shows the session again; it swaps the calendar under the running screens (`book`, `Diary` in
  src/agenda.ts; the glasses read it through `diary()` and redraw on `onDiary`). A reply on screen keeps its text;
  "Send and add" is offered only while the calendar it was read with is still the current one. Tests:
  src/app.test.ts "leaves the user on the screen they are on when Google is connected or disconnected…";
  src/glasses/calendar.test.ts "keeps a reply that was waiting for its tap when the calendar is disconnected…",
  "takes the next meeting off the top line when the calendar is disconnected, without leaving the screen".

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. A meeting added just before Google
is disconnected can still be taken back by its undo, with the sign-in it was added under, if that sign-in still
holds; otherwise a card says the meeting is still in the calendar.

Author's checks at 321ce4b: npm run check, 687 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
