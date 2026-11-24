# Glasses UX review, round 4: paper-plane voice-anywhere

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head 7eb716a. Diff: git diff 916babc..7eb716a.
Round 3 was at 1627a65; what changed since: git diff 1627a65..7eb716a -- src (two small changes, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=message Anna -5 degrees here` and hold.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 112 tests passed. Earlier rounds' fixes:
- Round 1: what was said is dropped once its own hold has been acted on; the first chat named is the recipient;
  no words after the name are trimmed.
- Round 2: a hold is bound to the screen on show (`held`, `chatOn`); a name said at "Which chat?" chooses.
- Round 3, Glasses UX F1 (punctuation after the name was stripped, so "-5 degrees" lost its minus): only one colon
  or comma right after the name is dropped (src/names.ts, LEAD). Test: "drops only a colon or comma after the name".
- Round 3, by the author: words that hold nothing the glasses can show start no reply (`showable` in
  src/glasses/app.ts). Test: "is not started by words the glasses cannot show at all".

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher. The Telegram adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
