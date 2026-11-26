# Security and privacy review, round 3: paper-plane release

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-submit, branch submission, base main c0fdeb6, head: the commit above 88aec25 (it adds
only these briefs). Diff: git diff c0fdeb6..88aec25.
Round 2 was at 5ef6133; what changed since: git diff 5ef6133..88aec25 -- docs/submission.md README.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Do not start the simulator or a
dev server. Make no request to any outside service, and run no `evenhub` command. Other reviewers share this
machine. Stop every process you started. Prove each finding with steps or one targeted test. For each finding,
decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, with this round's commit first. The round-1 brief beside this one says what the change is.

Round 2 (at 5ef6133): approve, no findings. One commit since, for Glasses UX's finding: two sentences in docs/submission.md and README.md about the `#trouble=` flag. This round is because a commit was added after your focus approved.

Author's checks: npm run check at b021468, 517 tests passed; the commits since change two documents.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
