# Architecture review, round 1: paper-plane release

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-submit, branch submission, base main c0fdeb6, head: the commit above b021468 (it adds
only these briefs). Diff: git diff c0fdeb6..b021468.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, not the relay at paper-plane-relay.jarekbird.workers.dev, and nothing to the Even Hub (no `evenhub`
command at all). Other reviewers share this machine. Stop every process you started. Prove each finding with steps
or one targeted test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and
its check if feasible).

Scope: the whole diff. Look at scripts/icon.mjs and its test, the rows added to docs/test-map.md and docs/ci.md, and whether README, docs/roadmap.md and docs/submission.md say what the code and the earlier pull requests do.

What the change is: what the second beta and the submission need, and no app code.
- Version 0.2.0 in app.json, package.json and the lock file's own entry.
- An app icon: assets/icon.png, written by scripts/icon.mjs from a 12 by 12 grid (Even Hub takes 24 by 24 and reads
  it two pixels by two); scripts/icon.test.mjs holds the file to the grid, the size and one colour.
- README: what was tried on real Telegram (one run on Jarek's account on 2026-11-26: signing in, the list of chats,
  signing out) and what was not; Google Calendar is not built yet.
- docs/roadmap.md: states brought up to date; mute left out (Jarek decided on 2026-11-26).
- docs/submission.md: a draft of the hackathon submission: what is asked for, the description, a shot list for the
  three-minute video, feature requests to pick from. Nothing is filed by this change.
- docs/ci.md and docs/test-map.md: the icon.

Uploading the beta and setting the icon on the Even Hub happen after this merges, by hand, on Jarek's word (he gave
it for 0.2.0). Neither is part of this change.

Author's checks at b021468: npm run check, 517 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
