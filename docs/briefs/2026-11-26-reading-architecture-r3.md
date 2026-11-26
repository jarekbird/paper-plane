# Architecture review, round 3: paper-plane reading

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-folders, branch folders, base main 936f78d, head: the commit above 3d47f27 (it adds
only these briefs). Diff: git diff 936f78d..3d47f27.
Round 2 was at bc4021a; what changed since: git diff bc4021a..3d47f27 -- src (one fix, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff, with this round's commit first.

What the change is: roadmap 3 (home: new first, "@ " where the user was mentioned) and roadmap 2 (pick a whole
Telegram folder). The round-1 brief beside this one lists the parts and the cases; the round-2 brief lists round
1's findings and fixes.

Round 2 (at bc4021a): changes needed, one finding.
- F1 (archived chats were left out before folder membership was asked, so a picked folder missed its archived
  chats): the adapter reads archived chats too (`archived: 'keep'`) and keeps one only when it is in one of the
  user's folders (`DialogLike.isArchived`, src/telegram/messenger.ts `chats`). Test: src/telegram/messenger.test.ts
  "lists an archived chat only when it is in one of the user's folders" (fails when the filter is taken out).
  The hundred chats that are read now count archived ones as well; said under Known.

Known, and said in the pull request:
- A folder renamed in Telegram counts as another folder: its pick is dropped and it has to be picked again.
- A removed folder replaced, while the app is closed, by a new one with the same id and the same name is taken for
  the same folder.
- Only the hundred newest chats are read, archived ones among them, so a folder's older chats do not show.
- On real Telegram (one run on Jarek's account, 2026-11-26) the list of chats came back with the round-1 code; the
  account showed no folder, so a folder with chats in it, a pinned or archived chat, a folder update and a mention
  have not been seen on Telegram.

Author's checks at 3d47f27: npm run check, 498 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
