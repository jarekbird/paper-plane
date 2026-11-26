# Security and privacy review, round 9: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 17154eb (it adds
only these briefs). Diff: git diff 809cdaf..17154eb.
Round 8 was at 5a2add2; what changed since: git diff 5a2add2..17154eb -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, no Google, and not the relay at
paper-plane-relay.jarekbird.workers.dev. Run no `wrangler` or `evenhub` command. Other reviewers share this
machine. Stop every process you started. Prove each finding with steps or one targeted test. For each finding,
decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible). Please report
everything in your focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff, with this round's commit first.

What the change is: roadmap 10, "Telegram + Calendar". The round-1 brief beside this one lists the parts and the
cases the author went through; the briefs of rounds 2 to 8 list the earlier findings and fixes.

Round 8 (at 5a2add2): changes needed, one finding.
- F1 (the clean-up of a cancelled connect acted after waiting for Google without rechecking which sign-in the phone
  holds, so it could remove, or renumber, a sign-in the user made meanwhile): after Google has answered, `finish`
  looks in the store's own turn whether the phone still holds exactly the sign-in that connect wrote (`holds(next)`).
  Only then is it set aside (`orphan`, when Google ended it) or counted and shown as connected (when Google could
  not be told). Otherwise it does nothing. Test: src/google/account.test.ts "A5: leaves a new sign-in alone when
  Google … only after the user connected again…", both outcomes of the held revocation (your sequence); both fail
  without the recheck.

How the Google sign-in's state is kept, in one place, for this round: `signIn` counts sign-ins and moves only inside
a turn of `inTurn`, together with the write it belongs to; `orphan` is the exact stored text of a sign-in that
Google ended and the phone could not remove, set only while the store holds that text, cleared by a successful
removal or by a new sign-in being kept; every result that arrives after a wait (a renewal, a refusal, a
revocation) is acted on only after rechecking, inside a turn, that it is still about the sign-in it began with.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. Connecting while already connected
is not offered by the phone page. When the phone's store fails in both places and Google cannot be reached, the
phone says what it could not do and where to end the sign-in at Google. A leftover copy of a sign-in that Google
ended is not counted while the app runs; after a restart it shows as connected until its first use fails, and is
then forgotten.

Author's checks at 17154eb: npm run check, 710 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
