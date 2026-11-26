# Security and privacy review, round 5: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 360e8e8 (it adds
only these briefs). Diff: git diff 809cdaf..360e8e8.
Round 4 was at e9ffcc8; what changed since: git diff e9ffcc8..360e8e8 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, no Google, and not the relay at paper-plane-relay.jarekbird.workers.dev. Run no `wrangler` or `evenhub`
command. Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one
targeted test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its
check if feasible).

Scope: the whole diff. Do not start the simulator: your focus is the code. This is round 5: by the repository's review loop, more rounds after it need
Jarek's word, so please report everything in your focus that you would hold the merge for now.

What the change is: roadmap 10, "Telegram + Calendar". The round-1 brief beside this one lists the parts and the
cases the author went through; the briefs of rounds 2 to 4 list the earlier findings and fixes.

Round 4 (at e9ffcc8): Security and privacy approve; Architecture and Glasses UX changes needed, one finding each:
- Architecture F1 (a connect the user cancelled could still be saved when the cancel came while the write was
  waiting its turn): `finish` in src/google/account.ts checks the caller's signal again inside the write's own turn,
  before anything changes; a sign-in that is then not kept is ended at Google (revoked) and the caller gets its
  cancel back. Tests: src/calendar-account.contract.ts "A5: connects nothing for a user who leaves the step while
  the code is being taken" (both implementations); src/google/account.test.ts "A5: keeps nothing, and has Google end
  the sign-in it picked up, when the user left while it was waiting to be written" (your sequence).
  Found by the author on the way and fixed with it: a sign-in the phone could not store (it is ended at Google, not
  counted as connected), and a disconnect the phone could not carry out (nothing changes: the sign-in counter moves
  only after the store did). Tests: the last two cases in src/google/account.test.ts.
- Glasses UX F1 (the meeting line's day was frozen when the reply opened, and the action outlived the meeting's
  start): the line is built from the clock at every draw, for the meeting bound when the reply opened, and the
  screen redraws each minute; line, hint and "Send and add" go once the start has passed. Tests:
  src/glasses/calendar.test.ts "S5: keeps the day on screen true while the reply waits…" and "stops offering a
  meeting once its start has passed while the reply waited".

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. Connecting while already connected
is not offered by the phone page; done through the interface it replaces the earlier sign-in without ending that
one at Google.

Author's checks at 360e8e8: npm run check, 698 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
