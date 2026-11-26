# Architecture review, round 5: paper-plane reading

Focus: Architecture. Report only findings in this focus.
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

Round 4 (at 3be8310): changes needed, two findings.
- F1 (a chat muted by the account's defaults counted as not muted in a folder that leaves muted chats out):
  src/telegram/client.ts asks Telegram for the three default settings (people, groups, channels) when a folder
  leaves muted chats out (`asksWhoIsMuted`, `mutedBy`), and the rule uses the chat's own setting first, then the
  default. Tests: src/telegram/folders.test.ts "takes a chat that has no setting of its own as muted when the
  account mutes its kind…", "asks Telegram who is muted by default only when…", "reads a default as muted while…".
- F2 (a mention read on another device was not heard): `updateReadMessagesContents` and
  `updateChannelReadMessagesContents` are named in `foldersChanged` (src/telegram/map.ts). Test:
  src/telegram/messenger.test.ts, the cases "tells listeners on %s".
Stepping back, as the review loop asks before round 6: rounds 1 to 4 each found one place where mtcute's
`Dialog.filterFolder` differs from Telegram. So the adapter no longer uses it. `holds` in src/telegram/folders.ts
is the rule of Telegram's own apps, written after TDLib's `DialogFilter::need_dialog` (read 2026-11-26): listed
and pinned chats, then the exceptions, then muted and read unless the chat has an unread mention, then archived,
then the kind of chat, where a bot is only a bot and the user's own Saved Messages a contact. Two more differences
from the library came out of that and are fixed and tested: bots in a non-contacts folder, and a muted chat with a
mention. Secret chats, which TDLib also handles, do not exist for this app: mtcute lists none.

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
