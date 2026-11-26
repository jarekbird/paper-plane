# Architecture review, round 2: paper-plane reading

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-folders, branch folders, base main 936f78d, head: the commit above bc4021a (it adds
only these briefs). Diff: git diff 936f78d..bc4021a.
Round 1 was at 366999c; what changed since: git diff 366999c..bc4021a -- src docs/architecture.md docs/test-map.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff. Do not start the simulator: your focus is the code.

What the change is: roadmap 3 (home: new first, "@ " where the user was mentioned) and roadmap 2 (pick a whole
Telegram folder). The round-1 brief beside this one lists the parts and the cases the author went through.

Round 1 (at 366999c): Glasses UX approve; Architecture and Security and privacy changes needed, four findings:
- Security F1 (the pick of a folder removed in Telegram passed to a new folder that got its id) and Architecture F2
  (the folders were rebuilt from the chats, so an empty folder vanished and a picked one could not be unpicked):
  `Messenger.folders()` lists the account's folders (both services, in the contract, with an empty one). The inbox
  loads it with the chats, keeps a folder pick by id and name (`folderPick(folder)`), and after every list that
  Telegram answered drops the picks of folders that are no longer listed, in memory and in the store. Tests:
  src/phone/model.test.ts, the last four cases under "picking a whole folder on the phone" (empty folder; removed
  and id reused while running; while closed; nothing dropped while Telegram cannot be asked); src/messenger.contract.ts
  "lists every folder of the account".
- Architecture F1 (a chat pinned in a folder was not counted as in it): src/telegram/folders.ts `foldersOf` adds the
  pinned chats to the library's own rule, which leaves them out whatever its second argument says (it only fills its
  pinned table when asked to exclude them). src/telegram/folders.test.ts runs the library's real `Dialog.filterFolder`
  over made-up filters: pinned, included, a shared folder, a rule with an exception, and "All chats" left out.
- Architecture F3 (a folder changed in Telegram was not heard, where the sample account tells): the adapter listens
  to the client's raw updates and tells its listeners on `updateDialogFilter`, `updateDialogFilterOrder` and
  `updateDialogFilters` (`foldersChanged` in src/telegram/map.ts; src/telegram/client.ts carries the listener over
  when the connection is replaced, like the other two). Test: src/telegram/messenger.test.ts "tells listeners when
  the user changes a folder in Telegram".

Known, and said in the pull request:
- A folder renamed in Telegram counts as another folder: its pick is dropped and it has to be picked again. That
  is the safe side of keeping a pick by id and name.
- A removed folder replaced, while the app is closed, by a new one with the same id and the same name is taken for
  the same folder.
- Only the hundred newest chats are read, so a folder's older chats do not show.
- On real Telegram (one run on Jarek's account, 2026-11-26) the list of chats came back with the round-1 code; the
  account showed no folder, so a folder with chats in it, a pinned chat, a folder update and a mention have not
  been seen on Telegram.

Author's checks at bc4021a: npm run check, 497 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
