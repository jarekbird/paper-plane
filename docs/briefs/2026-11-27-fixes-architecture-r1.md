# Architecture review, round 1: paper-plane, fixes from the end-to-end pass

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-fixes, branch pass-fixes, base main 3b2654f, head: the commit above f2d0068 (it adds
only these briefs). Diff: git diff 3b2654f..f2d0068.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. This worktree has its
own node_modules with Earshot 0.0.63. No whole suites, builds or npm run check; at most one targeted test per
finding, with a hard time limit (`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the
simulator or a dev server. Make no request to any outside service: no Telegram, no Google, not the relay, no
OpenRouter, no `wrangler` or `evenhub` command. Other reviewers share this machine. Stop every process you started.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible). Please report everything in your focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff: package.json and the lock (Earshot 0.0.63), src/telegram/map.ts (`mine`, the title), src/glasses/app.ts (`elsewhere`, `named`, `NAMES_A_CHAT`, the foot of a chat), the tests. Is "Saved Messages" as a title and the rule for `mine` in the right place (the mapping from Telegram, A1/A2)? Does anything else in the app go by `mine` or by a chat's title in a way these change (the home list, undo, quick replies, the calendar offer, likes, `findNamed`)? A6: the sample account has no Saved Messages chat; is a demo counterpart missing for anything here?

What the change is. Jarek asked for every fix the end-to-end pass on real Telegram and real Google found to be
built and merged. Four, each with tests that fail on the old code:
- Commands said by name. Earshot 0.0.63 (merged and tagged there on Jarek's word) chooses an option said by its very
  words, case and punctuation apart, without asking the model, so "Go home!" and "As I said it." from
  speech-to-text are the commands and no longer a reply to check. Here: the pin, and two tests in
  src/glasses/dictation.test.ts ("runs a command said by its very name…", "S5: takes \"Send.\" on a reply for the
  command, and still sends only after a tap").
- Saved Messages (src/telegram/map.ts). Telegram marks every message in the user's own chat as incoming, so the
  app took the user's notes for someone else's messages: no "You:", and "Like", "Save", quick replies and the
  calendar offer went by them. A note there is now the user's own, unless it was forwarded there, which is still
  someone else's message. And the chat is titled "Saved Messages", as in Telegram, where it had the user's own
  name. Tests: src/telegram/map.test.ts, two cases.
- A chat that is not on the glasses (src/glasses/app.ts). "Message Sam the demo moved", with Sam a chat of the
  user's that was not picked, became a reply to the open chat to check, or on the list a "Which chat?" list
  without Sam. Now the glasses say "That chat is not on your glasses". In a chat this holds for words that begin
  with "message", "text" or "open"; "tell Sam I said hi" stays a reply, since that is what one writes to a person.
  A name that is no chat of the user's at all asks "Which chat?" as before. Tests: src/glasses/app.test.ts, three
  new cases and one changed ("never writes to a chat that was not picked…").
- A chat shows "Tap to reply" only once its messages are there (it stood under "Loading…"). Test:
  src/glasses/app.test.ts, "offers \"Tap to reply\" only once…".
Also: docs/proof/voice/speech.md and the README line say the faults found with spoken audio are fixed; the
README's pin line.

Author's checks at f2d0068: npm run check, 729 tests passed. Spoken audio on this code in the simulator, sample
account, two voices: "Go home!" went to the list, "As I said it." brought back the words as said, "Open the chat
with Anna." opened the chat, "Message Sam the demo moved to four" left the list and Anna's chat as they were.

Known: on real Telegram nothing forwarded from someone else is in the test account's Saved Messages, so "Like" and
"Save" there are tried only as refusals of an own note; with this change a note with a time in Saved Messages no
longer offers a calendar entry. Real glasses are not tried.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
