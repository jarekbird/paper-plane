# Security and privacy review, round 2: paper-plane release 0.3

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-submission, branch release-0.3, base main 3f839c8, head: the commit above a1d9de1 (it
adds only these briefs). Diff: git diff 3f839c8..a1d9de1.
Round 1 was at 8d5b441; what changed since: git diff 8d5b441..a1d9de1.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, no Google, not the relay at paper-plane-relay.jarekbird.workers.dev,
and nothing to the Even Hub (no `evenhub` or `wrangler` command at all). Other reviewers share this machine. Stop
every process you started. Prove each finding with steps or one targeted test. For each finding, decide whether it
should be a repo-wide rule; if so, propose the rule (and its check if feasible). Please report everything in your
focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff. Look at what a build without the setting can still reach or show (src/main.ts, src/launch.ts, the privacy text in src/phone/privacy.ts, app.json), that no key or address entered the repository, and whether README, PRIVACY.md and docs/submission.md say what leaves the phone as the code does.

Round 1 (at 8d5b441): approve, no findings. One commit since, for the Glasses UX finding, in docs/submission.md only;
this round is because a commit was added after your focus approved.

What the change is: what the third beta and the submission need.
- A fix (rule A8). Since pull request 18 a build with a relay (`VITE_RELAY`) offered "Connect Google Calendar"
  whether or not that relay holds Google's client; the deployed relay does not yet, so the link would lead to a page
  that only says "Google Calendar is not set up". Now a build offers Google Calendar only when it is packed with
  `VITE_GOOGLE_CALENDAR=on` next to `VITE_RELAY`. `launch()` in src/launch.ts answers which calendar a start has
  (`'google' | 'sample' | 'none'`), src/main.ts goes by it, and scripts/pack.mjs says in its last line whether the
  pack has Google Calendar. Tests: src/launch.test.ts ("A8: offers Google Calendar only in a build that says…",
  "has the sample calendar to connect on the sample account…") and scripts/pack.test.mjs ("A8: says Google Calendar
  is on only when…"); each fails when the setting is ignored. The sample account (`#account=sample`) keeps its
  sample calendar and its connect step in every build.
- Version 0.3.0 in app.json, package.json and the lock file's own entry.
- Words: README (the setting, the state of the real-Telegram runs: signing in, 61 chats listed, staying signed in
  over a restart, signing out; sending not tried), docs/ci.md (shipping step 1 and 3), docs/test-map.md (A8),
  docs/roadmap.md, and docs/submission.md: the calendar in the description, a calendar shot in the video script
  (0:45 to 1:05) with the later shots moved, 0.2.0 named as the beta that is out. Nothing is filed by this change.

Author's proof, not committed: the app run twice in the simulator with a relay address set, without and with the
setting: without it the phone page has no Google Calendar section, with it the section is there.

Known, and said in the README: nothing has run against Google or on the deployed Worker; sending on real Telegram
and a run on real glasses are not proven. Uploading a beta happens after this merges, by hand, only on Jarek's word
(not given yet for 0.3.0); it is not part of this change.

Author's checks at a1d9de1: npm run check, 717 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
