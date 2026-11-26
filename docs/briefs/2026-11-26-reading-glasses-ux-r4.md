# Glasses UX review, round 4: paper-plane reading

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-folders, branch folders, base main 936f78d, head: the commit above 3be8310 (it adds
only these briefs). Diff: git diff 936f78d..3be8310.
Round 3 was at 3d47f27; what changed since: git diff 3d47f27..3be8310 -- src (below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible). Please report everything in your focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff, with this round's commit first.

What the change is: roadmap 3 (home: new first, "@ " where the user was mentioned) and roadmap 2 (pick a whole
Telegram folder). The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 and 3
list the earlier findings and their fixes.

Round 3 (at 3d47f27): approve, no findings. One commit since, for Architecture's findings, in
src/telegram only (which chats a rule-made folder holds, and when the list is read again). Nothing on the glasses
or the phone page changed; this round is because a commit was added after your focus approved.

Known, and said in the pull request:
- A folder renamed in Telegram counts as another folder: its pick is dropped and it has to be picked again.
- A removed folder replaced, while the app is closed, by a new one with the same id and the same name is taken for
  the same folder.
- Only the hundred newest chats are read, archived ones among them, so a folder's older chats do not show.
- A folder made by a rule about contacts or bots follows a person who becomes one only at the next list of chats.
- On real Telegram (one run on Jarek's account, 2026-11-26) the list of chats came back with the round-1 code; the
  account showed no folder, so a folder with chats in it, a pinned or archived chat, a folder update and a mention
  have not been seen on Telegram.

Author's checks at 3be8310: npm run check, 506 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
