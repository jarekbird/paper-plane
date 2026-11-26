# Glasses UX review, round 7: paper-plane calendar

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above c84289d (it adds
only these briefs). Diff: git diff 809cdaf..c84289d.
Round 6 was at 8b6dffd; what changed since: git diff 8b6dffd..c84289d -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, no Google, and not the relay at paper-plane-relay.jarekbird.workers.dev. Run no `wrangler` or `evenhub`
command. Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one
targeted test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its
check if feasible). Please report everything in your focus that you would hold the merge for now, not one finding
a round.

Scope: the whole diff, with this round's commit first. Do not start the simulator this round: the change is in the phone page's words and the account.

What the change is: roadmap 10, "Telegram + Calendar". The round-1 brief beside this one lists the parts and the
cases the author went through; the briefs of rounds 2 to 6 list the earlier findings and fixes.

Round 6 (at 8b6dffd): all three changes needed. What was found, and what changed:
- Security F1 (a disconnect could report success while one copy on the phone still held a usable sign-in):
  `CalendarAccount.signOut()` now answers what happened: `'ended'` when every copy on the phone is gone or Google
  ended the sign-in (then a leftover copy is of no use), `'here'` when the calendar is off this phone but a copy may
  remain and Google could not be told; it throws when nothing changed. Tests: src/google/account.test.ts "S3: does
  not call a disconnect complete when one copy on the phone could not be removed and Google could not be told" and
  "S3: calls a disconnect complete when a copy could not be removed but Google ended the sign-in…", both over the
  real two-place store.
- Security F2 (a cancelled connect became connected when the phone could not be put back) and Architecture F1 (a
  failed read before the write skipped the clean-up): in `finish`, everything after the pick-up runs in one
  function that answers kept, left or unkept; only "kept" counts the sign-in and tells listeners; every other end,
  whatever failed, ends the picked-up sign-in at Google. Tests: "A5: ends the sign-in it picked up at Google when
  the phone's store cannot even be read before it is kept", "A5: never calls a cancelled connect connected, also
  when the phone could not be put back…".
- Glasses UX F1 (a failed disconnect was silent on the phone page): src/phone/calendar.ts shows "Could not
  disconnect on this phone. Try again." and stays connected; for `'here'` it shows the calendar as off and says to
  end the sign-in in the Google account. Tests: src/phone/calendar.test.ts, the last two cases.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. Connecting while already connected
is not offered by the phone page. What the phone cannot do when its own store fails in both places and Google
cannot be reached: it then says the disconnect is not complete (`'here'`), or that it could not disconnect, and the
user is told where to end the sign-in at Google. A sign-in Google has ended and the phone cannot forget stays
"connected" on the phone page until the store works again; every use of it fails.

Author's checks at c84289d: npm run check, 706 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
