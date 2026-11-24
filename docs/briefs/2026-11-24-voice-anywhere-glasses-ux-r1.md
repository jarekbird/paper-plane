# Glasses UX review, round 1: paper-plane voice-anywhere

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head 811426e. Diff: git diff 916babc..811426e.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=open launch crew|message Anna the demo moved to four` and hold.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 106 tests passed. Earlier rounds' fixes: none.

What changed, as the user meets it (roadmap item 8, on the sample account):
- Chat titles are private targets: a model is offered "Open chat" and "Message someone", never a name (S1, G5).
- "Open <chat>": once those words chose "Open chat", src/names.ts matches the name on the phone against the picked
  chats. One match opens it with only the list behind it; none or several shows "Which chat?".
- "Message <chat> <words>": one match opens the reply screen "To <chat>" with the words after the name; a tap sends.
  A name alone opens the chat. Only picked chats can be named.
- "Mark all read" on every screen; said, it asks for a tap.
- What was said is kept for one use and ten seconds (src/glasses/app.ts, `said`).

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher, which picks by shared words and is cruder than the real navigator. The Telegram
adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
