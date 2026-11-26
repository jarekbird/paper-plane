# Security and privacy review, round 10: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 8e85936 (it adds
only these briefs). Diff: git diff 809cdaf..8e85936.
Round 9 was at 17154eb; what changed since: git diff 17154eb..8e85936 -- src.
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

Scope: the whole diff, with this round's two commits first.

What the change is: roadmap 10, "Telegram + Calendar". The round-1 brief beside this one lists the parts and the
cases the author went through; the briefs of rounds 2 to 9 list the earlier findings and fixes.

Round 9 (at 17154eb): approve, no findings. Two commits since, for the Architecture focus, in
src/google/account.ts and its test only:
- 77c494b: accepting a second cancelled connect left the marker of an earlier one in place, so `known()` hid the
  live second sign-in, or removed it once the store worked again. The marker is now dropped as soon as the store
  holds any other text, and accepting a cancelled connect clears it.
- 8e85936: between the write that could not be undone and Google's answer, the leftover of a cancelled connect
  counted as a sign-in (`known()` true, a key given out). Now it is no sign-in from the turn that wrote it, the
  phone takes it away as soon as it can, and a sign-in it wrote over has ended, with its listeners told.
This round is because commits were added after your focus approved.

How the Google sign-in's state is kept, in one place, for this round: `signIn` counts sign-ins and moves only inside
a turn of `inTurn`, together with the write it belongs to, also when that write is a cancelled connect that could
not be put back; `orphan` is the exact stored text of a sign-in the user left that the phone could not remove, set
in the turn that wrote it, dropped as soon as the store holds anything else, cleared by a successful removal, by a
new sign-in being kept, or when Google could not be told to end it and the phone still holds it (then it counts as
connected, and the phone page says so); every result that arrives after a wait (a renewal, a refusal, a
revocation) is acted on only after rechecking, inside a turn, that it is still about the sign-in it began with.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project does
not exist yet. A meeting further ahead than 250 calendar entries is not found. Connecting while already connected
is not offered by the phone page. When the phone's store fails in both places and Google cannot be reached, the
phone says what it could not do and where to end the sign-in at Google. A leftover copy of a sign-in the user
left is not counted while the app runs, unless Google could not be told to end it; after a restart it shows as
connected until its first use fails, and is then forgotten.

Author's checks at 8e85936: npm run check, 714 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
