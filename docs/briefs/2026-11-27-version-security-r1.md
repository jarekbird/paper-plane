# Security and privacy review, round 1: paper-plane version 0.3.1

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-docs, branch version-0.3.1, base main 1a46438, head: the commit above c445725 (it adds
only these briefs). Diff: git diff 1a46438..c445725.
Read CLAUDE.md and docs/ci.md ("Shipping") first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it. No whole suites, builds or npm run check. Do not start the
simulator or a dev server. Make no request to any outside service. Stop every process you started. Please report
everything in your focus that you would hold the merge for now.

Scope: the whole diff: the version, 0.3.0 to 0.3.1, in app.json, package.json and the lock file's own two entries.
Nothing else. The docs still name 0.3.0 as the beta that is out, which stays true: nothing is uploaded by this
change, and a beta goes to the Even Hub only on Jarek's word.

Author's checks at c445725: npm run check, 721 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
