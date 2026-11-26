# Security and privacy review, round 1: paper-plane calendar

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-calendar, branch calendar, base main 809cdaf, head: the commit above 000dac5 (it adds
only these briefs). Diff: git diff 809cdaf..000dac5.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, no Google, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money. Run
no `wrangler` command. Other reviewers share this machine. Stop every process you started. Prove each finding with
steps or one targeted test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule
(and its check if feasible). Please report everything in your focus that you would hold the merge for now, not one
finding a round.

Scope: the whole diff. Do not start the simulator: your focus is the code. Look hardest at: the sign-in's whole way (worker/google.ts,
worker/pairs.ts, src/google/account.ts): who can pick a sign-in up, how often, for how long it is kept, what a
page or an answer shows, what is logged (nothing may be), the client secret; the open `/google/refresh` call; what
the phone keeps (src/store.ts `google`) and when it forgets it; S5 on the reply screen (is what is added exactly
what was shown; can a meeting be added without a tap, twice, or after the user left); what goes to Google (the
chat's name as the meeting's title: said on the privacy page); that no meeting, message or name reaches a model
(G5); app.json's two new hosts; PRIVACY.md and src/phone/privacy.ts against the code.

What the change is: roadmap 10, "Telegram + Calendar", with Jarek's choices of 2026-11-26.
- Home: the list's top line shows the next meeting ("Next: 11 AM Design review"; "Now: …" while it runs; "Sample: …"
  for the sample calendar). src/agenda.ts keeps it fresh.
- Reply screen: when the newest message from someone else in the open chat names a time (src/when.ts, rules, on the
  phone), a fixed line above the foot shows the meeting ("Calendar: Today 12:30 to 1:30 PM, Anna"). Tap sends the
  reply only (Jarek: "Tap sends; menu adds"). "Send and add" (menu, or said and confirmed by a tap) sends the reply,
  then adds that meeting; the chat then says "Sent and added. Tap to undo", and undo takes back both.
- Google: `src/google/account.ts` (connect by a link and six typed digits, renew, disconnect) and
  `src/google/calendar.ts` (next, add, remove, straight to Google). The phone page has a "Google Calendar" section
  (`src/phone/calendar.ts`, `src/phone/page.ts`). The sign-in is kept on the phone (`src/store.ts`).
- Worker: `worker/google.ts` (`/google/start`, `/google/callback`, `/google/pickup`, `/google/refresh`) and
  `worker/pairs.ts`, a Durable Object that keeps a sign-in for five minutes at most and hands it over once.
- Rule S1 is reworded with Jarek's OK (he answered "Yes, change S1" on 2026-11-26): a Google sign-in passes through
  the Worker when it is made and when it is renewed; the calendar itself goes only between the phone and Google.
- app.json: Google's two hosts on the whitelist. PRIVACY.md and the phone page say what goes to Google.

The cases the author went through:
- Someone has the link but not the phone: the pair in the link is the hash of a secret that never leaves the
  phone until pick-up; pick-up needs that secret and the six digits Google's sign-in page ended on.
- A wrong code: the Worker's entry is gone with the first try; the phone starts over.
- Two pick-ups at the same moment: one gets the sign-in (worker/pairs.test.ts).
- Nobody picks it up: gone after five minutes, by an alarm, and refused by time even before the alarm ran.
- Google refuses the code, or gives no lasting sign-in: nothing is kept.
- Google ends the sign-in later: renewal answers 401, the phone forgets the sign-in and the calendar leaves the
  glasses (A8). The relay cannot be reached for a renewal: the sign-in is kept and the meeting line goes away.
- The Worker has no Google client: its Google calls answer 404, the rest of the relay works.
- A meeting with no time of day, or cancelled: passed by. No title: "Busy".
- The message names no time, there is no calendar, or the draft was started from the list for a chat read earlier:
  no meeting is offered.
- The chat's name is too long for the line: the meeting is named as far as the line shows it.
- "Send and add": the message fails: nothing is added, the reply stays. The message goes and the calendar
  refuses: "Sent. Could not add it to the calendar", undo for the message only. The message had already gone in an
  earlier try (no message comes back): the meeting is added, "Sent and added", no undo.
- Undo after "Sent and added": message first, then the meeting; if the meeting cannot be taken back, a card says
  it is still in the calendar.
- A model is asked about a hold on these screens: no meeting, time or message is in what it is offered.

Known, and said in the pull request: nothing here has run against Google or on the deployed Worker; the stand-in
(src/google/testing.ts) follows Google's documentation. Whether a link opens the phone's browser from inside the
Even app is untried. The Worker's Google client id is not in worker/wrangler.toml yet: the Google Cloud project
does not exist yet. A person who is sent a link by someone else and then also tells them the six digits gives that
someone their calendar; the code page says to type the code only into Paper Plane on one's own phone and to give it
to nobody.

Author's checks at 000dac5: npm run check, 643 tests passed. Simulator: screenshots in docs/proof/calendar.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
