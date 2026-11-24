# Heads Up hackathon: the terms this app is built to

Source: <https://dorahacks.io/hackathon/even-realities/detail>, read 2026-11-23. Registered as `jarekbird`.

- Build week 23–29 November 2026. Submit by **29 November, 23:59 Dubai** (12:59 Mountain). Demo Day 3 December.
- Submit: a public repository with a README that explains setup, a demo video of up to 3 minutes (simulator or
  glasses), a short description (the problem, who it is for, how it works, the track). Optional: up to five feature
  requests for the APIs used, and a packed `.ehpk`.
- Build during the week. Open-source libraries and existing APIs are allowed; the README says what existed before.
- The core integration is on the track's apps. This app enters **01 Messaging & News** (Telegram) and, because
  Telegram and Google work in one flow, **04 AI Assistants & Work** (Google Workspace, OpenRouter). It is also up for
  the Best Telegram integration prize.
- Never commit keys or secrets. Respect the terms of the services and the privacy of the people whose messages show.

## What is judged

| Weight | What                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------- |
| 30%    | Usefulness on G2: a real everyday moment, at a glance and hands-free                               |
| 25%    | Read and write: acting is fast, a short phrase, one tap or the ring, smart defaults or AI drafts   |
| 20%    | Technical execution: works end to end, reliable, clean code                                        |
| 15%    | UX for display and voice: clear on 576 × 288 monochrome, natural by voice                          |
| 10%    | Business potential and safety: real users and demand, careful with data and money                  |

## The device, as the organizers put it

- Display 576 × 288 per eye, monochrome green. Input: microphone, touch on the glasses, the R1 ring. No camera, no
  speaker.
- One app on screen at a time; no alerts when the user is elsewhere. No access to other apps' notifications.
- Bring your own speech-to-text. External calls are whitelisted in `app.json` and pass CORS. No keys in the app.
- Google sign-in does not work in the web view: use a separate page or a pairing code.
- "Design for a glance: one thing on screen and a few words."
