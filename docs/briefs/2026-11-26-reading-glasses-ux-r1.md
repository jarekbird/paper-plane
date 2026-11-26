# Glasses UX review, round 1: paper-plane reading

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-folders, branch folders, base main 936f78d, head: the commit above 366999c (it adds
only these briefs). Diff: git diff 936f78d..366999c.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff. You are the only reviewer running the simulator this round: port 5213, run folder under /tmp/pp-ux-reading;
`sim.hold` needs `Simulator.start({ mic: true })` even with `#say=`. The sample account has two folders (Friends,
Work) and one mention (in Launch crew). Look hardest at: the home list (order, the "@ " mark, whether it fits and
reads at a glance, what happens to the cursor when the order changes); the phone page's folder section (words,
the greyed box of a chat that is on through its folder); touch, menu and voice doing the same (A7).

What the change is: two roadmap items about what reaches the glasses.
- Roadmap 3, home: the picked chats with something new come first, the others below in Telegram's order; "@ "
  before a chat in which a new message mentions the user. `Chat.mentions` (mtcute's `unreadMentionsCount`); marking a
  chat read clears its mentions too (`readHistory(chat, { clearMentions: true })`); a chat whose only new thing is a
  mention counts as new for the order, for opening and for "mark all read" (`hasNew` in src/inbox.ts).
- Roadmap 2, folders: the phone page lists the account's Telegram folders above the chats. A picked folder
  (`folder:<id>` among the picks) puts every chat in it on the glasses and follows the folder. `Chat.folders`; the
  Telegram adapter reads the folders once per list of chats (`getFolders`) and asks mtcute's own
  `Dialog.filterFolder` which dialogs each holds; the sample account has two folders.
- It also adds the simulator screenshots of the trouble screens merged in #15 (docs/proof/trouble).

The cases the author went through:
- A message arrives in a read chat: it moves above the read ones. The cursor of Earshot's list stays on its row
  number, as it did on main when Telegram's own order changed.
- A mention whose message was read on another device (unread 0, mentions 1): "@ Title", listed as new, cleared by
  opening the chat or by "mark all read".
- A chat picked on its own and also in a picked folder: unpicking the folder leaves it on; while the folder is
  picked its box is checked and greyed, with "In <folder>".
- A chat added to a picked folder in Telegram: on the glasses at the next list of chats; taken out: gone.
- A folder removed in Telegram: its pick stays stored and matches nothing. If Telegram later gives the same id to
  a new folder, that folder shows as picked on the phone page, where it can be unpicked. Known, not handled.
- Only the hundred newest chats are read, so a folder's older chats do not show. Known.
- No folders: the phone page shows no folder section.

Known, and said in the pull request: on real Telegram (one run on Jarek's account, 2026-11-26) the list of chats
came back with this code, so `getFolders` answered; the account showed no folder, so a folder with chats in it and a
mention have not been seen on Telegram.

Author's checks at 366999c: npm run check, 486 tests passed. Simulator: home list and phone page, screenshots in
docs/proof/reading and docs/proof/folders.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
