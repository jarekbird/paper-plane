# Architecture review, round 4: paper-plane park-and-like

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head 72f3f81. Diff: git diff 24f7f14..72f3f81.
Round 3 was at 8d969e9; what changed since: git diff 8d969e9..72f3f81 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it: open a chat by a tap, then Even's menu has Like and Save; with `#say=see you at twelve thirty` a hold on
the chat opens a reply whose menu has "Keep for later". Other reviewers share this worktree and the same simulator
and dev-server ports: if the simulator will not start, review from the tests and the code and say so. Prove each
finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-voice-anywhere-*-r7.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 159 tests passed. Earlier rounds' fixes:
- Round 1: keeping takes a cancel signal and belongs to the app's lifetime; Like and Save wait while a chat loads.
- Round 2: Like and Save take the first message from someone else with a line in view; a failed or out-of-date load
  offers no target.
- Round 3, Security F1 (a message edited after the chat opened kept its old text on screen, yet Save forwarded the
  new one): the chat screen reloads on every change the inbox reports, not only when the newest message's id
  changes, so an edit is shown; while that load is in flight there is no target (`current`). A target's id is the
  message's id and its text as shown, so Earshot does not find it again at the tap if the text changed. A chat is
  marked read only when its unread count is above zero, which keeps "reload on every change" from looping with an
  adapter that reports its own reads. The sample account gains `edit` for tests. Tests: "shows the new text when it
  is edited, and saves what is shown", "S5: is not saved when it is edited between the spoken command and the tap",
  "S5: is not saved from the old text while the edited one is still loading", "is marked read only when it has
  something new".

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
