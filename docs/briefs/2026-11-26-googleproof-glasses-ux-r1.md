# Glasses UX review, round 1: paper-plane, what was run on real Google

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-docs, branch google-proof, base main 68e77b3, head: the commit above 3e99861 (it adds
only these briefs). Diff: git diff 68e77b3..3e99861.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Do not start the simulator or a
dev server. Make no request to any outside service: no Telegram, no Google, not the relay, nothing to the Even Hub.
Other reviewers share this machine. Stop every process you started. For each finding, decide whether it should be
a repo-wide rule; if so, propose the rule (and its check if feasible). Please report everything in your focus that
you would hold the merge for now, not one finding a round.

Scope: the whole diff: words only, in README.md, docs/roadmap.md and docs/submission.md. Do the words match what the glasses and the phone page show ("Send and add", "Sent and added. Tap to undo", "Taken back", "Connected. Your next meeting is on the glasses.")?

What the change is. On 2026-11-26 the app was run against real Google, with Jarek's go, from the simulator: the
code of main at 68e77b3 built with the deployed relay's address and `VITE_GOOGLE_CALENDAR=on` and no Telegram app
id, so the chats were the sample chats and the calendar a test Google account's own.
- Connect: the phone page's link, Google's consent for the test account in a cloud browser, the six digits from
  the relay's page typed into the phone page: "Connected. Your next meeting is on the glasses."
- The list's top line lost the sample meeting once connected, and after an add it read "Sample chats, next
  Tomorrow 12:30 PM Anna", also after a fresh connect in a later run.
- A reply from a long quick reply of the user's own opened the reply screen with "Calendar: Tomorrow 12:30 to
  1:30 PM, Anna"; menu "Send and add": "Sent and added. Tap to undo"; Google Calendar's own web page then listed
  one entry named Anna where it had none.
- In a later run the same, with a tap on the undo: "Taken back"; Google Calendar's page listed one entry named Anna
  before and one after.
- Disconnect: the phone page went back to "Connect Google Calendar", with no problem shown.
Then beta 0.3.0 was packed from 68e77b3 with Telegram, voice and Google Calendar in it and promoted to beta on the
Even Hub, on Jarek's word ("Ship once Google works"). The run's scripts and logs are outside the repository (they
hold an account's pages; rule S4), so the proof here is the author's report.

Known: the Google app is in testing mode (only listed test accounts can connect); opening Google's sign-in from
inside the Even app on a phone is untried; nothing has run on real glasses.

Author's checks at 3e99861: npm run check, 718 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
