# Security and privacy review, round 1: paper-plane roadmap

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane, branch roadmap, base main b8fd628, head 110f668. Diff: git diff b8fd628..110f668.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
This change has no code: it adds docs/roadmap.md, the rules G5 and G6, rewords S1, S5 and S6, and brings README.md,
docs/test-map.md, docs/architecture.md and the review skill in line. There is nothing to run in the simulator.
Prove each finding with the lines it is about.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff.
Author's checks at head: npm run check, 59 tests passed. Earlier rounds' fixes: none.

Context the diff does not show: Jarek chose each rule change by question card on 2026-11-23 ("Your words only";
"Channels with sponsored messages"; Telegram + Calendar and "Park it and reactions" as the stand-out features; Gmail
and voice messages wait). The "Draft a reply" action in src/glasses/app.ts stays until roadmap item 7 replaces it; it
calls no model.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
