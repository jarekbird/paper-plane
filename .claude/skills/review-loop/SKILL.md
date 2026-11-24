---
name: review-loop
description: Review a Paper Plane branch with a panel of focused reviewers before it merges. Use after a branch passes npm run check, or when Jarek asks for a review.
---

# Review loop

Reviewers are read-only: they run the app and at most one targeted test per finding, never a whole suite, a build or
`npm run check`, and never edit the branch.

## Panel

Each focus has its own reviewer. Add a focus by adding a row.

| Focus | Looks for |
|---|---|
| Architecture | Breaks of `CLAUDE.md`'s rules, an overview in `docs/architecture.md` that does not match the change, a rule or check changed without its row in `docs/test-map.md`, wrong data shape, duplication, replaced paths left behind (C2), comments (C1), code the goal does not need |
| Security and privacy | Anything that weakens the S-rules: Telegram data through a server of ours, more than S1's two things leaving for the Worker, anything read from Telegram given to a model (G5), a URL or host outside the whitelist, a key or app id in the repository or the bundle, message text, names, audio, transcripts or tokens in a log or an error, a send without its exact text shown and a tap, message text parsed as a command, anything the Worker keeps, new dependencies |
| Glasses UX | More than one thing on a screen or more than a few words (C5), text that does not fit the display or uses characters the font lacks, an input that is not an Earshot action, so touch, the menu and voice differ (A7), a hold bound to another chat than the one on screen (A5), a feature shown before the user set it up (A8), a copy-and-paste step (C3) |

A change to `src/telegram`, `src/google`, `src/voice`, `worker/` or `app.json` always gets the Security and privacy
focus. A change to `src/glasses` or `src/phone` always gets Glasses UX.

## A round, per focus

1. The author commits, runs the focused checks (`docs/test-map.md`) and `npm run check`, and writes
   `docs/briefs/<batch>-<focus>-r<n>.md` from the template.
2. Start one fresh reviewer per focus with `delegate_task`, from the provider that did not write the code: Codex
   (`gpt-6.1-sol`, high) for Claude's work, and Claude for Codex's. Never with `isolation: worktree`: a worktree per
   reviewer fills the disk. The reviewer works in the author's worktree at the reviewed head. The author changes
   nothing there until every reviewer at work in it has reported.
3. The reviewer runs the changed part with skill `simulator` from that worktree, in a run folder of its own, tests
   its focus, stops the run, then reads the diff with `git show` and `git diff`. It never edits, commits, installs,
   checks out, switches, resets, stashes or cleans.
4. The author checks each finding, fixes blockers and shoulds with tests (C4), and starts that focus's next round
   with a new reviewer.

A focus is done when a round has no blockers or shoulds. A commit added after approval gets new rounds. Nothing merges
on a fix no reviewer has read.

## After round 5

Round 5's findings are fixed and re-reviewed like any round's. If a focus still has not approved, the author steps
back before asking for more: is the loop unlikely to end, because the same issue is argued again and again, or fixes
cause new findings of the same kind? It writes what it found in `docs/briefs/<batch>-<focus>-loop.md`, then asks
Jarek with `AskUserQuestion` for 5 more rounds. Until he answers, the branch waits.

## Conflicts

A rebase or merge whose conflicts were resolved by hand gets one more round per focus, on the resolution only: the
brief names the commits resolved by hand and gives `git range-diff <old base>..<old head> <new base>..HEAD` for them.

## Rule proposals

For each finding, the reviewer decides whether it should be a repository-wide rule, and if so proposes it in its
answer. The author opens a **draft PR** against `main` for each proposed rule, from a worktree of its own, removed
once the PR is open. The PR adds the rule to `CLAUDE.md` and its row to `docs/test-map.md`, plus the check if one is
feasible (a rule in `eslint/plugin.js`, with its cases in `eslint/rules.test.js`), and is left for Jarek to review.

## Brief template

A brief holds no message text, names, numbers, tokens or keys (S4): the repository is public.

```
# <Focus> review, round <n>: paper-plane <batch>

Focus: <focus>. Report only findings in this focus.
Repo <worktree>, branch <branch>, base main <sha>, head <sha>. Diff: git diff <base>..HEAD.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff | conflict resolution only: <commits>, range-diff: <command>.
Author's checks at head: npm run check, <n> tests passed. Earlier rounds' fixes: <one line each>.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
```
