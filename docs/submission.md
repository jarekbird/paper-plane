# Submission

Roadmap 17. A draft: nothing here is filed until Jarek says so. Due **29 November 2026, 12:59 Mountain** (23:59
Dubai), on DoraHacks, as `jarekbird`. The terms are in `docs/hackathon.md`.

## What goes in

| Asked for | Where it is | State |
| --- | --- | --- |
| Public repository | <https://github.com/jarekbird/paper-plane> | there |
| README with setup, and what existed before 23 November | `README.md` | there; last pass before filing |
| Demo video, up to 3 minutes | filmed by Jarek from the script below | to film |
| Short description: the problem, who it is for, how it works, the track | below | draft |
| Packed `.ehpk` (optional) | `npm run pack`; the beta on the Even Hub | 0.2.0 is on beta |
| Up to five feature requests for the APIs used (optional) | below | draft |

## Description

**Name:** Paper Plane

**One line:** Telegram on your glasses, with your calendar in the same flow: read at a glance, answer by voice,
send with one tap.

**The problem.** A message arrives while your hands and eyes are busy. Taking out the phone means losing the moment
you were in, and usually ten more minutes with it.

**Who it is for.** People whose day runs through Telegram and who want to stay in the room: on a walk, at the
stove, in a meeting, on a bike.

**How it works.**

- On the phone you pick the chats that may reach your glasses. Nothing else does.
- The glasses show those chats with what is new. A tap opens one, newest message first.
- To answer, hold the touchpad and speak. Your words appear on the glasses; one tap sends them, and "Sent. Tap to
  undo" stays for five seconds.
- Say less and it writes more: "tell her yes and ask where" becomes a full message for you to check.
- No time to speak? Tap for Yes, No, or one of your own phrases.
- Your next meeting is the top line of the list. When someone writes "I can do 12:30", your reply can also put
  that meeting on your Google Calendar: you see both before anything goes, and one undo takes back both.
- Everything else works by voice from any screen: "open launch crew", "message Sam the demo moved", "mark all
  read", "like that", "keep for later".
- Channels are there too, each followed by Telegram's sponsored message, as Telegram's terms ask.

**What is different.**

- It is a real Telegram client, signed in as you, running on your phone. No bot, and no server to host: install,
  sign in, done.
- No AI model ever reads your chats. AI turns what *you say* into a message; a chat said by name is matched on
  the phone.
- Nothing is sent on a model's word: every message, and every calendar entry, shows its exact text and where it
  goes, and only your tap sends it.
- Telegram and Google in one flow, with no server in between: the phone asks Google's calendar itself, and the
  time in a message is read on the phone by rules, not by a model.
- When something is wrong, the glasses say what: "Cannot reach Telegram", "Telegram says wait 2 minutes".
- Measured, not promised: 48 of 50 spoken commands and replies did what was meant on the real model, and 93 of 102
  "say it short" instructions came back as the message that was meant.

**Tracks.** 01 Messaging & News (Telegram), and 04 AI Assistants & Work (Google Calendar; OpenRouter for speech to
text, choosing the action, and writing a message out). Also entered for the Best Telegram integration prize.

**Built on.** Earshot, the author's open-source voice-first framework for G2 apps; mtcute for Telegram's protocol;
one small Cloudflare Worker that holds the OpenRouter key and Google's client secret, and keeps nothing but a
Google sign-in on its way to the phone, for five minutes at most.

**To be honest about.** Say in the description what was run where, as the README does. As of 26 November: every
screen and the voice flow run on a built-in sample account; the voice relay and both models were tried live; on
real Telegram the app signed in, listed the chats, stayed signed in over a restart and signed out; the calendar
runs on a sample calendar; sending on real Telegram, anything against Google and a run on real glasses are not
proven yet. Update this paragraph, and the README's "State", on the day of filing.

## Video: up to 3 minutes

Filmed on real glasses where it can be, with the simulator as a stand-in for any shot that will not film well.
The same script works for both: each shot names what the glasses show.

Before filming:

1. Accept the tester invitation in the Even app and install the beta.
2. On the phone page, pick four chats: two people, one group, one channel. The script calls the two people Anna
   and Sam, as the sample account does (there, tick Sam: he is not picked at the start); a chat can be opened or
   written to by name only when it is picked.
3. Have someone ready to send a message on cue (or a second account of your own).
4. Charge the glasses; film in a room dim enough for the display to show on camera.
5. For simulator shots: `npm run dev`, then `npx evenhub-simulator http://127.0.0.1:5183`, and record the screen.

| Time | On screen | Do and say | Voice-over |
| --- | --- | --- | --- |
| 0:00–0:10 | You, hands busy (cooking, or walking with a bag). The phone buzzes on the table and stays there. | Glance up. | "A message. I do not need my phone for this." |
| 0:10–0:25 | Glasses: the list of picked chats, one with (2); the top line says "Next: 11 AM Design review" (your own next meeting, at its time). | Tap. The chat opens, newest message first. | "Paper Plane puts the Telegram chats I pick on my Even G2, under my next meeting. One tap, and I am reading." |
| 0:25–0:45 | Glasses: Sam's chat, then "To Sam / Almost there, save me a seat / Tap to send", then "Sent. Tap to undo". | Hold, say "Almost there, save me a seat", let go, tap. | "To answer I hold and speak. I see my exact words before anything goes, and one tap sends them." |
| 0:45–1:05 | Glasses: Anna's "I can do 12:30 at the usual place.", then the reply with "Calendar: Today 12:30 to 1:30 PM, Anna" (the day and time the message names), then "Sent and added. Tap to undo". | Hold, say "See you there". Open the menu, choose "Send and add". | "She names a time. My answer goes to Telegram and the meeting to my Google Calendar: both shown first, and one undo takes back both." |
| 1:05–1:20 | Glasses: "Writing it out…", then the full message. | In a chat, hold, say "tell her yes and ask where", check, tap. | "If I say less, it writes more. It only ever works on what I say: no model reads my chats." |
| 1:20–1:32 | Glasses: the three short answers. | Tap the chat, swipe to a phrase, tap. | "No time to talk: Yes, No, or my own phrases, in two taps." |
| 1:32–1:57 | Glasses: the list, then a draft to Sam; then a chat, then "Like: the top message from someone else? Tap to confirm". | From the list, hold: "message Sam the demo moved to four". Tap. In a chat, hold: "like that". Tap. Hold: "go home". | "And everything works by voice, from any screen. Message someone by name. Like a message. Go home." |
| 1:57–2:10 | Phone: Telegram's chat list with the draft in it. | In a chat, say a reply, then menu > Keep for later. Show the phone. | "Not ready to send? Keep it. It is the chat's draft in Telegram, waiting on my phone." |
| 2:10–2:22 | Glasses: a channel's posts, then "Sponsored". | Open the channel, swipe down. | "Channels too, with Telegram's sponsored message, as Telegram asks of a client." |
| 2:22–2:40 | Phone page: "To Telegram", "Kept by us", "Sent in your name: Only what you tapped". Then glasses: "Cannot reach Telegram". | Scroll the page. Turn on flight mode, tap send. | "It is a real Telegram client on my phone. No bot, no server of mine. And when something is wrong, it says so." |
| 2:40–2:55 | The README's results, then the repository. | | "48 of 50 voice commands right on the real model. Open source, built this week on Earshot. Paper Plane." |

Shots that need a real Telegram sign-in: 1:57–2:10 (the draft on the phone), the incoming message at 0:00, and
"Cannot reach Telegram" by flight mode at 2:22. The calendar shot at 0:45 needs Google Calendar connected on the
phone page, and a message with a time in it as the newest of the chat.

On the sample account the two calendar screens read differently from the table, and by the clock:

- The top line is "Sample chats, next 1 PM Design review". The sample meeting starts on the hour, one to two hours
  after the app was opened, so the time shown is never the table's.
- Anna's "I can do 12:30" is counted from when the app was opened. Opened before 12:30, the line says "Calendar:
  Today 12:30 to 1:30 PM, Anna"; opened later, it says "Tomorrow". To film it as the table has it, open the app
  before 12:30; otherwise say "tomorrow" in the voice-over.

Also on the sample account: film "Kept as a draft" on the glasses
instead and drop the phone shot; and for "Cannot reach Telegram" open the app with `#trouble=unreachable`
(`http://127.0.0.1:5183/#account=sample&trouble=unreachable&say=See you at noon` in the simulator; `account=sample`
is needed in a build that has Telegram in it, where trouble is never staged on your own chats), where the sample chats lose
Telegram eight seconds after launch and have it back at thirty: open a chat and say the reply first, then tap to
send inside that window.

If time runs short, cut 2:10–2:22 first, then 1:20–1:32.

## Feature requests (optional, up to five)

Drafts from this build week, for Jarek to pick from:

1. **Even Hub: a way to test voice in CI.** The simulator needs a sound device to record a hold, so a headless run
   cannot exercise the microphone path without a fake one.
2. **Even Hub: one line in the manifest for a library's inert URLs.** The store check reads every URL in the
   bundle; a protocol library carries link formats it never connects to, and each needed a hand-written exception.
3. **Telegram: test accounts for client developers again.** The test servers no longer take the documented test
   numbers, so a client's sign-in can only be tried on a real account.
4. **Telegram: a clearer answer from my.telegram.org when an app id cannot be created.** "Too many attempts" with
   no time to wait.
5. **OpenRouter: a per-key allow-list of models and a daily cap**, so a key behind a public relay can be limited to
   exactly what the app uses.
