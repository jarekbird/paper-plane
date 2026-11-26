# Security and privacy review, round 2: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 84a4b4d (it adds
only these briefs). Diff: git diff 809cdaf..84a4b4d.
Round 1 was at 000dac5; what changed since: git diff 000dac5..84a4b4d -- src worker docs/test-map.md docs/architecture.md.
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
cases the author went through.

Round 1 (at 000dac5): all three changes needed. What was found, and what changed:
- Architecture F1 and Security F1 (a renewal's result could overwrite a newer sign-in, delete it, or bring a
  disconnected one back; writes were not ordered): src/google/account.ts counts sign-ins (`signIn`); a renewed key
  is written, and a refusal acted on, only for the sign-in it was asked under, and every write of the sign-in takes
  turns (`src/turns.ts`, the helper the Telegram account already had, now one module with its own tests). Two calls
  that need a renewed key at the same moment share one request. Tests: src/google/account.test.ts, the cases from
  "A5: does not bring a sign-in back when a renewal that Google granted answers after the user disconnected" on
  (Google's answer is held, then the user disconnects, or disconnects and connects anew; granted and refused; the
  write itself held).
- Architecture F2 and Security F2 (every failed renewal became 401, so a hiccup erased the sign-in): the Worker
  answers 401 only when Google answers 400 `invalid_grant`, else 502; the phone forgets the sign-in only on 401.
  Tests: worker/google.test.ts "does not call the sign-in ended when Google …" (four cases);
  src/google/account.test.ts "keeps the sign-in when the relay says Google could not be reached…".
- Architecture F3 (a 401 from the calendar itself did not reach the account): src/google/calendar.ts renews the key
  once through the account (`refused`) and asks again; if Google has ended the sign-in the account forgets it and
  tells its listeners, and src/app.ts then shows the session again without a calendar (A8). If Google refuses even
  the renewed key, the calendar drops the sign-in (`drop`). Tests: src/google/calendar.test.ts "renews its key and
  asks again…", "A8: forgets the sign-in and tells its listeners when Google has ended it…".
- Architecture F4 (ten all-day entries could hide the next meeting): `next` reads on by `nextPageToken`, fifty
  entries a page, five pages at most. The stand-in pages too. Tests: "finds the next meeting with a time behind any
  number of all-day entries…", "stops reading pages at some point…".
- Architecture F5 (connecting had two implementations and no shared contract): src/calendar-account.contract.ts,
  run against the sample sign-in and the Google one (wrong code uses the sign-in up, a code before any start, a
  user who left, disconnect, listeners).
- Glasses UX F1 (with Google connected and Telegram not, the top line lost "Sample chats"): with sample chats the
  top line is "Sample chats, next 11 AM Design review" ("Sample chats, now Design review" while it runs), whichever
  calendar the meeting is from. Tests: src/glasses/calendar.test.ts "keeps saying that the chats are samples…",
  src/app.test.ts "still says the chats are samples when Google is connected and Telegram is not".

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation, including the `invalid_grant` answer the Worker now reads.
Whether a link opens the phone's browser from inside the Even app is untried. The Worker's Google client id is not
in worker/wrangler.toml yet: the Google Cloud project does not exist yet. A meeting further ahead than 250 calendar
entries is not found.

Author's checks at 84a4b4d: npm run check, 675 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
