# Security and privacy review, round 2: paper-plane channels

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-channels, branch channels, base main 2ab1355, head 04a4ea0 (the commit above it adds only these briefs). Diff: git diff 2ab1355..04a4ea0 -- . ':!docs/briefs'.
Round 1 was at 31757e0; what changed since: git diff 31757e0..04a4ea0 -- src (two fixes, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any outside
service (no Telegram, no relay). To run the app use skill `simulator` with a run folder under /tmp, then stop it:
on the sample account the third chat, "Glasses news", is a channel.
Other reviewers share this machine and the simulator's ports. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: roadmap item 13 and rule G6 ("Channels are in, each post list followed by Telegram's sponsored
message, as its API terms (3.3) require"). Until now a picked channel was shown like any chat, with "Tap to reply".
- src/messenger.ts: `Sponsored { id, title, text, link }`; `Messenger.sponsored(chat)` and `sawSponsored(sponsored)`.
- src/demo/messenger.ts: the sample channel has a sample sponsored message; `seenSponsored()` for tests.
- src/telegram: `messages.getSponsoredMessages` and `messages.viewSponsoredMessage` as two raw calls in client.ts
  (mtcute 0.32.8 has no method of its own for them); the adapter gives the first message and keeps Telegram's
  random id to report it seen. src/messenger.contract.ts runs against the sample account and the adapter over a
  stand-in client.
- src/glasses/app.ts, the chat screen of a channel: posts without the channel's name before each; after them a blank
  line, "Sponsored: <title>", the text, the link without its scheme wrapped over lines, all as cleaned plain text. It is asked for once
  per opening of the screen, after the posts loaded; a failure or none leaves the posts alone. `sawAd` runs when a
  frame is drawn with no notice over it and reports the message seen once, when its whole block is in view (or,
  for one taller than the screen, when its end is reached after its start was shown). A channel has no Reply and
  no Undo, its tap is bound to nothing, its foot says "Read only", and it is no target for a spoken reply (the
  screen is not in `chatOn`); "message <channel> …" opens it instead of starting a reply.
Tests: src/glasses/channel.test.ts, src/messenger.contract.ts, src/telegram/messenger.test.ts.
Author's checks at head: npm run check, 366 tests passed. Simulator on the sample account:
docs/proof/channels/channel.png.

Round 1: Security and privacy approve; Architecture and Glasses UX changes needed, one finding each:
- Architecture F1 (a frame of another screen covering the channel reported the sponsored message as seen): the
  screen's listener for drawn frames does nothing unless the channel is the screen on show (`router.current ===
  self`). That holds for the sponsored message and for the message Like and Save act on, which shared the listener.
  Test: "is not called seen while another screen covers the channel".
- Glasses UX F1 (a long link was cut and could not be read): the link wraps over lines, in the scrolling body.
  Test: "shows a long link in full".

Known and not in this change: none of it has run on Telegram itself (no app id yet), so the two raw calls are
untried there. The glasses cannot open a link, so the sponsored message's link is shown as text and a click is
never reported. Telegram's `postsBetween` (several sponsored messages between posts) is not used: one message,
after the posts on show. The screen lists the newest post first, so "after the posts" is below the oldest one
shown. A channel the user may post in is still read only. Reporting or hiding a sponsored message is not offered.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
