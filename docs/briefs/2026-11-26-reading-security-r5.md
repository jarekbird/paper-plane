# Security and privacy review, round 5: paper-plane reading

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-folders, branch folders, base main 936f78d, head: the commit above 756c854 (it adds
only these briefs). Diff: git diff 936f78d..756c854.
Round 4 was at 3be8310; what changed since: git diff 3be8310..756c854 -- src (below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff, with this round's commit first. This is round 5: by the repository's review loop, more
rounds after it need Jarek's word, so please report everything in your focus that you would hold the merge for now.

What the change is: roadmap 3 (home: new first, "@ " where the user was mentioned) and roadmap 2 (pick a whole
Telegram folder). The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 to 4
list the earlier findings and their fixes.

Round 4 (at 3be8310): approve, no findings. One commit since, for Architecture's findings, in
src/telegram only: which chats a rule-made folder holds is now decided by the rule of Telegram's own apps instead of
the library's (src/telegram/folders.ts `holds`); for a folder that leaves muted chats out, the app asks Telegram for
the account's three default notification settings (a read, `account.getNotifySettings`); the list of chats is read
again on two more updates. A chat still reaches the glasses only if the user picked it or its folder.

Known, and said in the pull request:
- A folder renamed in Telegram counts as another folder: its pick is dropped and it has to be picked again.
- A removed folder replaced, while the app is closed, by a new one with the same id and the same name is taken for
  the same folder.
- Only the hundred newest chats are read, archived ones among them, so a folder's older chats do not show.
- A folder made by a rule follows these changes only at the next list of chats, not at once: a person becoming a
  contact, and a mute that runs out by time.
- On real Telegram (one run on Jarek's account, 2026-11-26) the list of chats came back with the round-1 code; the
  account showed no folder, so no folder with chats in it, no folder rule, no folder update and no mention has
  been seen on Telegram.

Author's checks at 756c854: npm run check, 514 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
