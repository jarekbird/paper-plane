# Security and privacy review, round 5: paper-plane voice-anywhere

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head cd21e06. Diff: git diff 916babc..cd21e06.
Round 4 was at 7eb716a; what changed since: git diff 7eb716a..cd21e06 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=message Anna I will go back tomorrow|mark all read` and hold.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 119 tests passed. Earlier rounds' fixes:
- Round 1: what was said is dropped once its own hold has been acted on; the first chat named is the recipient;
  no words after the name are trimmed.
- Round 2: a hold is bound to the screen on show; a name said at "Which chat?" chooses.
- Round 3: only a colon or comma after the name is dropped; words with nothing to show start no reply.
- Round 4, Glasses UX F1 ("message Sam I will go back tomorrow" was taken as "go back"): `commandOf` in
  src/names.ts reads a command by its first words (message, tell, text, optionally "to"; open, show) when a picked
  chat is named right after them. The app's navigator model (`model` in src/glasses/app.ts) answers those itself
  with the "Message someone" or "Open chat" option and asks the given model only for everything else. Intended: the
  explicit command wins on every screen, also while another chat is open, and the reply screen shows where it goes.
- Round 4, Security F1 ("Mark all read" resolved its chats at the tap): the action has one target whose id is the
  sorted ids of the unread picked chats, so Earshot finds it again at the tap and runs nothing if the set changed
  (outcome "gone"). By touch (`choose`) it marks the current set at once.

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher. The Telegram adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
