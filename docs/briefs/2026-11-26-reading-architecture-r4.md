# Architecture review, round 4: paper-plane reading

Focus: Architecture. Report only findings in this focus.
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

Round 3 (at 3d47f27): changes needed, two findings.
- F1 (a folder of unread chats left out a chat with one unread message, because mtcute's `Dialog.isUnread` starts
  at two): src/telegram/folders.ts hands the library's rule a view of the dialog with Telegram's count (one
  message, a mention, or marked unread by hand) and the dialog's own muted and archived state. Test:
  src/telegram/folders.test.ts "counts a chat with one unread message as unread…" (0, 1, 2 unread give false, true,
  true on the real rule; fails without the view) and "leaves muted and archived chats out…".
- F2 (a chat archived, muted or marked unread elsewhere stayed in or out of a rule-made folder until another
  update came): `foldersChanged` in src/telegram/map.ts also names `updateFolderPeers`, `updateNotifySettings` and
  `updateDialogUnreadMark`. Test: src/telegram/messenger.test.ts, one case per raw update, and one for updates
  that change no folder.
The author went through the rest of what a rule-made folder reads: read state and new messages are heard already
(`history_read`, `new_message`); a person becoming a contact or a bot is not heard, see Known. The adapter asks
Telegram for the folders twice per list (once for the chats' membership, once for the list of folders): two small
requests, kept apart on purpose so `chats()` and `folders()` each stand alone.

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
