# Roadmap

Decided with Jarek on 2026-11-23. A feature is done when its screen is designed, it is built, its tests below pass,
and Jarek has tried it on real glasses. Deadline: 29 November, 12:59 Mountain (`docs/hackathon.md`).

## Why this list

Most Telegram entries are one app: picked chats as cards, three AI drafts, tap to send, hold to dictate, through a
bot or a server the user hosts. Paper Plane stands out by:

1. **Nothing to host.** A real Telegram client on the phone alone: install, sign in, done.
2. **Everything by voice**, not only dictation: any action from any screen.
3. **What only a real client can do**: Telegram drafts, Saved Messages, reactions, folders, undo.
4. **A true two-track flow**: a time in a message becomes an answer and a calendar event in one tap.
5. **Proof**: real glasses, a real account, a published voice test.
6. **No model reads your chats** (rule G5).

## Features

| #   | Feature                                                                                                    | State                    |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Sign in on the phone: number, code, two-step password; stays signed in; sign out                           | built; never run on Telegram |
| 2   | Pick what reaches the glasses: single chats, or a whole Telegram folder                                    | chats built, on samples  |
| 3   | Home: picked chats, unread first, mentions marked, live as messages arrive                                 | list built, on samples   |
| 4   | Read: newest message first, names in groups, attachments named, marked read when shown                     | built, on samples        |
| 5   | Reply by voice: hold, speak, see it, tap sends; say it again to replace; double tap drops                  | built, on samples        |
| 6   | Say it short: "tell her yes and ask where" becomes a full message to check and send                        | built; 69 of 72 on the real model |
| 7   | Quick replies: three short answers from fixed rules and the user's own phrases                              | built, on samples        |
| 8   | Anything by voice, from any screen: open a chat, message someone, mark read, mute, go back                 | built but mute, samples  |
| 9   | Undo: "Sent. Tap to undo" for five seconds                                                                 | built, on samples        |
| 10  | Telegram + Calendar: next meeting on home; a time in a message offers "answer and add to calendar"         |                          |
| 11  | Park it: "Keep for later" makes an unsent reply the chat's Telegram draft; "Save" copies to Saved Messages   | built, on samples        |
| 12  | Reactions: "like that"                                                                                     | built, on samples        |
| 13  | Channel digest, each followed by Telegram's sponsored message (rule G6)                                    |                          |
| 14  | Privacy screen: what leaves the phone, in plain words                                                      |                          |
| 15  | Trouble handled: no connection, Telegram asking to wait, signed out elsewhere                              |                          |
| 16  | Sample account for judges, no sign-in                                                                      | built                    |
| 17  | Submission: `.ehpk`, Even Hub beta, README, a 3-minute video on real glasses                               |                          |

Order: 1 to 9 first, then 10, 11, 12, 13. 14 to 17 run alongside.

## Before the Telegram build can ship

- An app id (my.telegram.org). Without one the build has no Telegram and shows only the sample account.
- `VITE_RELAY` in the build (the Worker `paper-plane-relay` is deployed and holds its key): without it a hold on
  real glasses hears nothing.
- A run on real Telegram: sign-in, chats, sending, on Jarek's own account, writing only to Saved Messages.

## Not now

- Voice messages (send from the glasses, read incoming ones as text).
- Gmail.
- AI that reads chats to suggest replies (rule G5).

## How each feature is tested

- Unit tests on Earshot's stand-in glasses for every screen and rule.
- One contract test, run against the sample account in CI. Telegram's test servers stopped taking test numbers in
  2026, so against Telegram it runs by hand on Jarek's own account, writing only to Saved Messages.
- A simulator run per screen, with a recording.
- A voice test: about 40 phrases against the real navigator, with the score in the README.
- Failure paths: wrong code, lost connection, Telegram's wait limits.
- Jarek's pass on real glasses.
