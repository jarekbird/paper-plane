# Security and privacy review, round 2: paper-plane, what the end-to-end pass ran

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-docs, branch e2e-state, base main dafaf28, head: the commit above 23d773e (it adds
only these briefs). Diff: git diff dafaf28..23d773e.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. The worktree has no
node_modules. No whole suites, builds or npm run check. Do not start the simulator or a dev server. Make no
request to any outside service. Other reviewers share this machine. Stop every process you started. For each
finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible). Please
report everything in your focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff: words only, in README.md, docs/roadmap.md and docs/submission.md. Do the words claim only what the brief says was run, and say plainly what was not? Is any name, number, chat, message, code or key of a real account in the diff (S3, S4)?

Round 1 (at 23d773e): changes needed, one finding.
- F1 (README says of Telegram and Google together "one undo taking back both", but the brief showed no check of
  Google's side in that run): the run was made again on main at dafaf28, with the test Google calendar counted
  through Google's own API (a sign-in for the test tool made the way the app makes one): 0 entries before, 1
  while "Sent and added. Tap to undo" was on the glasses, 0 after the tap and "Taken back"; and the reply was in
  Saved Messages in Telegram Web while the undo was offered and gone after (10 of 10 checks). The words in the
  README stand as they are; no file changed since round 1 but this brief. The other two focuses approved round 1.

What the change is. On 26 and 27 November (UTC) the author ran the app end to end on real services, at Jarek's
asking: the app in Even's simulator, signed in to Jarek's own Telegram account (kept session), with Saved Messages
the only chat picked, every write made in Saved Messages and each result looked up in his Telegram Web; and with a
test Google account. The scripts print only the test's own sentences and the app's fixed words; they and their
logs are outside the repository (rule S4), so this proof is the author's report. What ran, with counts of the
checks that passed:
- Send and leave, replace, drop, quick reply with undo, a message arriving from another device (209 ms), "Go home"
  by scripted voice, "Keep for later" as the chat's draft: 24 of 26 (the two misses were the test expecting "You:"
  on lines of Saved Messages, where Telegram marks every message as incoming).
- By scripted voice: "Open <chat>", "Go back", "Message <chat> …" sent and undone, "Like" (the like seen in
  Telegram Web), "Like" again ("Already liked"), "Save" (a second copy seen), "Go home": 14 of 14.
- The network to Telegram cut by a local proxy: a draft still made; a send said "Cannot reach Telegram", then
  "Not sent. Tap to try again"; after the network returned one tap sent exactly one copy: 7 of 7. A message sent
  from another device while offline showed on the open chat after reconnecting; a start with no network showed
  "Cannot reach Telegram / Tap to try again" and came back signed in: 7 of 7.
- A spoken reply (synthesized speech into the simulator's microphone, the real speech-to-text) made a draft, was
  sent and undone: 3 of 3; "Go home" spoken went home in one run and became a reply to check in another (the open
  fault of docs/proof/voice/speech.md).
- Telegram and Google together: Google connected on the phone page beside Telegram; the list's top line read
  "Next: …" from Google; a reply to a note in Saved Messages naming a time showed "Calendar: Tomorrow 12:30 to
  1:30 PM, …"; "Send and add", then one tap: "Taken back", the reply gone from Telegram.
- Google alone, on the sample chats: a wrong code refused in words; "Cancel"; entries made through Google's API:
  an all-day entry passed by, "next 9:56 PM PP soon" then "now PP soon" within a minute of its start, a long name
  cut with "…", an entry with no name shown as "Busy"; and after 62 minutes, past the first key's hour, a meeting
  added and taken back, so the key was renewed through the relay.
Not run on real Telegram: folders, mentions, channels, "Telegram says wait", a sign-in ended elsewhere. Not run at
all: real glasses.

Author's checks at 23d773e: prettier on the three files; no code changed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
