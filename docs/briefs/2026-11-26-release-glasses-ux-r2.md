# Glasses UX review, round 2: paper-plane release

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-submit, branch submission, base main c0fdeb6, head: the commit above 5ef6133 (it adds
only these briefs). Diff: git diff c0fdeb6..5ef6133.
Round 1 was at b021468; what changed since: git diff b021468..5ef6133 -- docs/submission.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Do not start the simulator or a
dev server. Make no request to any outside service, and run no `evenhub` command. Other reviewers share this
machine. Stop every process you started. Prove each finding with steps or one targeted test. For each finding,
decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, with this round's commit first. The round-1 brief beside this one says what the change is.

Round 1 (at b021468): changes needed, two findings, both in the video script (docs/submission.md).
- F1 (the setup picked one person, the script names two): the setup now picks two people, a group and a channel,
  and says that Sam has to be ticked on the sample account.
- F2 (flight mode cannot show "Cannot reach Telegram" on the sample account): the note under the table lists that
  shot among the ones that need a real sign-in, and says how to stage it on samples with `#trouble=unreachable`.

Author's checks at 5ef6133: npm run check at b021468, 517 tests passed; this round's commit changes one document.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
