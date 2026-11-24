# Glasses UX review, round 2: paper-plane voice-anywhere

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head 3ecec79. Diff: git diff 916babc..3ecec79.
Round 1 was at 811426e; what changed since: git diff 811426e..3ecec79 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=open launch crew|message Anna the demo moved to four` and hold.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 108 tests passed. Earlier rounds' fixes:
- Security F1 and Architecture F1 (words of one hold reused by a later touch): `said` is cleared in a microtask
  after the hold's own lifetime ends, which Earshot 0.0.35 ends just before it acts on the verdict, in the same
  task. So only the action those words chose can read them. The ten-second limit is removed. Tests: "A5: does not
  use what was said in an earlier hold for a touch that follows at once", "A5: does not aim a reply dictated in one
  chat at another chat named in it". This leans on Earshot's order; the open-by-name tests fail if it changes.
- Glasses UX F1 (a name inside the message took over as recipient): the first chat named is the one meant; at the
  same place the longer name wins; a tie asks which chat (src/names.ts).
- Glasses UX F2 (leading words removed): only punctuation after the name is dropped; the words stay as spoken.

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher. The Telegram adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
