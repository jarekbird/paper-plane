# Glasses UX review, round 1: paper-plane, what was run on real Telegram

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-docs, branch sending-proof, base main 2e005be, head: the commit above 17b5b24 (it adds
only these briefs). Diff: git diff 2e005be..17b5b24.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, no Google, not the relay, nothing to the Even Hub. Other reviewers
share this machine. Stop every process you started. Prove each finding with steps. For each finding, decide whether
it should be a repo-wide rule; if so, propose the rule (and its check if feasible). Please report everything in your
focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff: words only, in README.md, docs/roadmap.md and docs/submission.md. Do the words match what the glasses show and do ("Sent. Tap to undo", "Keep for later", "Kept as a draft"), and is the video table of docs/submission.md still right?

What the change is. Two runs were made on 2026-11-26 on Jarek's own Telegram account, with his OK, from the app in
the simulator (the code of main at 2e005be, built with his Telegram app id), with Saved Messages the only chat
picked, and each result checked in his Telegram Web:
- A reply: one hold (its words scripted with `#say=`, not spoken), one tap. The line was in Saved Messages when
  Telegram Web was looked at 251 ms after the tap (looked at every 200 ms). A second tap on "Sent. Tap to undo":
  the line was gone.
- "Keep for later": a hold for the reply, a hold heard as "Keep for later", a tap to confirm. Telegram Web then
  showed that text as the draft of Saved Messages and no such message sent. The draft was cleared afterwards.
The scripts and their output are outside the repository (they run on a real account; rule S4), so the proof here is
the author's report, and the words say whose account and how. Nothing else changed: no code, no test.

Also in the diff: the submission table says DoraHacks takes the video as a link (read on its page today).

Known: on real Telegram folders, mentions, channels, reactions and the trouble paths have not been tried; nothing
has run against Google or on real glasses.

Author's checks at 17b5b24: npm run check, 717 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
