# Architecture

## Overview

Kept by hand. A change that adds or moves a module, a connection or a data flow updates this picture first, in its
design (skill `develop`). Arrows point from caller to callee. The picture is the rules of `CLAUDE.md`; a box with no
node in the module map below is not built yet.

```mermaid
flowchart TB
  subgraph app["App, in the Even app on the phone · src/"]
    main["src/main.ts<br>waits for the bridge, hands it on"]
    page["Phone page<br>src/phone"]
    glasses["Glasses screens<br>src/glasses"]
    messenger["Interfaces<br>src/messenger.ts"]
    subgraph services["Services, no UI"]
      telegram["src/telegram"]
      google["src/google"]
      voice["src/voice"]
      demo["src/demo<br>sample account, no network"]
    end
    store["src/store.ts"]
    earshot["Earshot<br>Router and Shell: screens, touch, hold, menu<br>Glasses: draws, reads input, records<br>Lifetime, the store's places"]
    bridge["Even SDK bridge"]
  end
  device["G2 glasses"]
  tg["Telegram's servers"]
  gapi["Google's APIs"]
  subgraph ours["Developer's Cloudflare account"]
    worker["Worker · worker/<br>voice, Google sign-in"]
  end
  openrouter["OpenRouter"]

  main --> glasses
  main --> page
  main --> services
  main --> store
  glasses -- "A2" --> messenger
  page -- "A2" --> messenger
  services -. "implement" .-> messenger
  glasses -- "screens: a view and actions each (A7)" --> earshot
  earshot -- "draw, input, microphone (A3)" --> bridge
  store -- "storage (A3)" --> bridge
  bridge <--> device
  telegram -- "session, chats, messages (S1)" --> tg
  google -- "calendar" --> gapi
  google -- "sign-in, picked up once (S7)" --> worker
  voice -- "the sound of a hold and the words heard in it, nothing read from Telegram (S1, G5)" --> worker
  worker --> openrouter
  worker -- "sign-in" --> gapi
```

Two things leave the phone for the Worker, and nothing else (S1). The OpenRouter key and Google's client secret
live only on the Worker (S3), which stores nothing but a Google sign-in on its way to the phone (S7).

Trouble is part of the interfaces, not of a screen: a call of `Messenger` fails with `TroubleError` when Telegram
cannot be reached (the service gives up on a call after fifteen seconds, and asks nothing once the connection has
been gone three) or asks the user to wait, and tells its listeners when Telegram is back. A message the user
confirmed is one attempt, however often it is tried: `send` takes the attempt, and the service gives every try of
it the same identity at Telegram, so a message whose answer was lost does not arrive twice: a later try is
answered with no message, which means sent, with nothing to take back. A sign-in that Telegram
ended from another device is told by `Account.onEnded` in the same step in which the service learns of it and
replaces its connection. Everything the account writes to the phone's store of the sign-in then runs in one line,
one write after the other, and a removal is done only when every copy has answered, so an old removal can never
land on a newer sign-in. The words for both are in
`src/trouble.ts` and `src/phone/signin.ts`; the sample account stages each (`src/demo`, A6).

What reaches the glasses is what the user picked on the phone: single chats, or a whole Telegram folder. A service
lists the account's folders (`Messenger.folders`) and says for each chat which of them it is in; `src/inbox.ts`
keeps a folder pick by the folder's id and name, and forgets it when the account no longer lists that folder.

Every screen is an Earshot screen: a view and a list of actions. Earshot's `Router` holds the stack of screens, its
`Shell` reads the touchpad, runs the action a tap, a swipe, the menu or the voice chose, and its `Glasses` alone
talks to the Even SDK bridge. Timers, listeners, sockets and requests belong to an Earshot `Lifetime` (A4), and code
that owns one awaits through it (A5).

## Module map

Generated from the imports ESLint sees, with the boundaries `eslint.config.js` enforces. Tests are left out. Arrows
point from importer to imported. `npm run check` fails when this is stale; `npm run architecture` regenerates it.

<!-- module-map:start -->
```mermaid
flowchart LR
  _evenrealities_even_hub_sdk["@evenrealities/even_hub_sdk"]
  _mtcute["@mtcute"]
  earshot["earshot"]
  src_account_contract_ts["src/account.contract.ts"]
  src_app_ts["src/app.ts"]
  src_demo["src/demo"]
  src_glasses["src/glasses"]
  src_inbox_ts["src/inbox.ts"]
  src_instruction_ts["src/instruction.ts"]
  src_launch_ts["src/launch.ts"]
  src_main_ts["src/main.ts"]
  src_messenger_contract_ts["src/messenger.contract.ts"]
  src_messenger_ts["src/messenger.ts"]
  src_names_ts["src/names.ts"]
  src_phone["src/phone"]
  src_phrases_ts["src/phrases.ts"]
  src_replies_ts["src/replies.ts"]
  src_store_ts["src/store.ts"]
  src_telegram["src/telegram"]
  src_trouble_ts["src/trouble.ts"]
  src_voice["src/voice"]
  src_writer_contract_ts["src/writer.contract.ts"]
  src_account_contract_ts --> src_messenger_ts
  src_app_ts --> earshot
  src_app_ts --> src_glasses
  src_app_ts --> src_inbox_ts
  src_app_ts --> src_messenger_ts
  src_app_ts --> src_phone
  src_app_ts --> src_phrases_ts
  src_app_ts --> src_trouble_ts
  src_demo --> earshot
  src_demo --> src_instruction_ts
  src_demo --> src_messenger_ts
  src_glasses --> earshot
  src_glasses --> src_inbox_ts
  src_glasses --> src_instruction_ts
  src_glasses --> src_messenger_ts
  src_glasses --> src_names_ts
  src_glasses --> src_phrases_ts
  src_glasses --> src_replies_ts
  src_glasses --> src_trouble_ts
  src_inbox_ts --> earshot
  src_inbox_ts --> src_messenger_ts
  src_inbox_ts --> src_trouble_ts
  src_main_ts --> _evenrealities_even_hub_sdk
  src_main_ts --> earshot
  src_main_ts --> src_app_ts
  src_main_ts --> src_demo
  src_main_ts --> src_glasses
  src_main_ts --> src_launch_ts
  src_main_ts --> src_phone
  src_main_ts --> src_store_ts
  src_main_ts --> src_telegram
  src_main_ts --> src_voice
  src_messenger_contract_ts --> src_messenger_ts
  src_phone --> earshot
  src_phone --> src_inbox_ts
  src_phone --> src_messenger_ts
  src_phone --> src_phrases_ts
  src_phrases_ts --> earshot
  src_store_ts --> earshot
  src_telegram --> _mtcute
  src_telegram --> earshot
  src_telegram --> src_messenger_ts
  src_trouble_ts --> src_messenger_ts
  src_voice --> earshot
  src_voice --> src_instruction_ts
  src_voice --> src_messenger_ts
  src_writer_contract_ts --> src_instruction_ts
  src_writer_contract_ts --> src_messenger_ts
```

Enforced by `eslint.config.js`:

- **A1** src/telegram, src/google, src/voice, src/demo must not import src/glasses, src/phone.
- **A1** src/telegram, src/google, src/voice, src/demo must not import Router, Shell, Glasses, boxes, list, text, FRAME_TAG, Screen, View, RouterOptions, ShellOptions, ShellWords, GlassesOptions, GlassesBridge, Box, Frame, MenuItem, Picture, Brightness, Drawing, DrawOp, Input, HoldSource from earshot.
- **A2** src/glasses, src/phone must not import src/telegram, src/google, src/voice, src/demo.
- **A2** src (but not src/telegram) must not import @mtcute/.
- **A3** src (but not src/main.ts) must not import @evenrealities/even_hub_sdk.
<!-- module-map:end -->
