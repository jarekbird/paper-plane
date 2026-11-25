# Glasses UX review, round 1: paper-plane pack tests and the environment

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-packfix, branch pack-test-env, base main 8638d58, head 5b741c0 (the commit above it adds only these briefs). Diff: git diff 8638d58..5b741c0.
Read CLAUDE.md, docs/test-map.md and docs/ci.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds,
packs or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any
outside service and run no `evenhub` command that reaches the Even Hub.
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: a test fix. Jarek said "Ship the beta" on 2026-11-25; the ship ran `npm run check` in a clean
checkout with `VITE_RELAY` in `.env.local` (docs/ci.md, step 1) and three cases of scripts/pack.test.mjs failed:
Vitest loads that file's VITE_ settings into the environment, and `parts()` counts the environment on purpose (it
asks Vite's `loadEnv`, as the build does). The cases now clear the three settings before each and restore them
after, and a new case shows the environment being counted. No code outside the test changed. docs/roadmap.md notes
the first beta (0.1.0: sample chats and voice).
Author's checks at head: npm run check with `VITE_RELAY` in `.env.local`: 367 tests passed (before the fix: 3
failed); without it: passes too (CI).

Known and not in this change: other tests were not audited for the same dependence beyond that whole-suite run
with the setting present.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
