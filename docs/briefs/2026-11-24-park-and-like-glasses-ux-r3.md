# Glasses UX review, round 3: paper-plane park-and-like

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head 8d969e9. Diff: git diff 24f7f14..8d969e9.
Round 2 was at 0aa7d91; what changed since: git diff 0aa7d91..8d969e9 -- src.
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
Author's checks at head: npm run check, 155 tests passed. Earlier rounds' fixes:
- Round 1: keeping takes a cancel signal and belongs to the app's lifetime; Like and Save wait while a chat loads.
- Round 2, Security F1 and Glasses UX F1 (Like and Save could take a loaded message that was not in view): the chat
  lays out each message as a block of lines (`layout`), and the target is the first message from someone else with
  at least one line inside the rows on show (`inView`). So a long own reply filling the display leaves nothing to
  like, and scrolling to an older message makes it the target. A message taller than the display can only ever be
  partly in view; one line in view counts. Tests: "S5: is not liked or saved while a long reply of the user's own
  hides it, and is once the user scrolls to it", "likes the first message from someone else that is in view after
  scrolling".
- Round 2, Architecture F1 (after a failed refresh the old messages stayed a valid target): `current` now needs no
  load in flight, no failure, and a history loaded for the newest message the inbox knows (`shownFor`, set only on
  success); a load that is not the latest started is dropped. Tests: "A5: is not liked from an old view after a
  newer message failed to load", "A5: shows the newest history when an older load answers last".

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
