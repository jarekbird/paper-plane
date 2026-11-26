# Architecture review, round 6: paper-plane calendar

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 8b6dffd (it adds
only these briefs). Diff: git diff 809cdaf..8b6dffd.
Round 5 was at 360e8e8; what changed since: git diff 360e8e8..8b6dffd -- src.
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
cases the author went through; the briefs of rounds 2 to 5 list the earlier findings and fixes.

Round 5 (at 360e8e8): changes needed, two findings.
- F1 (a cancel that came during the write still connected the account): `finish` looks at the caller's signal again
  after the write, in the same turn, and puts the phone's store back as it was; the unused sign-in is ended at
  Google. Test: src/google/account.test.ts "A5: is not connected when the user left while the sign-in was being
  written…" (your sequence).
- F2 (a disconnect that failed in one of the store's two places left the sign-in unreadable but the app not told):
  after a write that failed, the account goes by what the store holds (`stored`, `holds`): a disconnect counts as
  done when the sign-in can no longer be read, the sign-in counter moves and listeners are told. Test: "A8: counts
  as disconnected, and tells its listeners, when one of the phone's two copies could not be written…", through
  `storeOver` with two places.
The note the review loop asks for after round 5 is docs/briefs/2026-11-26-calendar-architecture-loop.md: the two
findings are one kind (the moment of a write to the phone's store), answered once: after any write that failed or
was overtaken by a cancel, go by what the store holds. Jarek allowed more rounds. Please go through `finish`,
`forget`, `renew`, `stored` and `holds` together, for a cancel, a failure in one place and a failure in both, at
each write, and report all you find at once.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. Connecting while already connected
is not offered by the phone page; done through the interface it replaces the earlier sign-in without ending that
one at Google. If the phone's store can be neither written nor read, a disconnect fails and says so, and the
sign-in stays.

Author's checks at 8b6dffd: npm run check, 700 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
