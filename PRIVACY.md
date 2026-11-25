# Privacy

Paper Plane is a Telegram client that runs in the Even Realities app on your phone and draws on your G2 glasses.
The phone page of the app says the same as this page, under "What leaves this phone"; a test keeps the two word for
word alike.

## To Telegram

Your sign-in, the chats you open and what you send go straight from this phone to Telegram. No server of ours is in
between, and none ever sees them.

You sign in with your own number, the code Telegram sends you, and your password if the account has one. They are
typed on the phone and go to Telegram only.

## When you hold to talk

The sound of that hold goes to Paper Plane's relay. AI models at OpenRouter turn it into words, and the words into
an action or a written-out message. Nothing else goes with it: no message, no chat name and no person's name from
Telegram.

- The relay is a small Cloudflare Worker (`worker/` in this repository). It adds the key that pays for the models
  and passes the request on to [OpenRouter](https://openrouter.ai), which runs them: speech-to-text
  (`openai/whisper-large-v3-turbo`), the navigator that picks an action (`typesafe/jev-1.14`) and the writer behind
  "tell her yes and ask where" (`mistralai/mistral-nemo`). What those providers keep is in their own terms.
- With the words, the navigator is sent the names of the app's own actions ("Go back", "Send") and of the screen
  ("One chat"). A chat you name is matched on the phone and is not part of that list.
- No model reads your chats. AI works on what you say, never on what Telegram holds.

## Kept on this phone

Your Telegram sign-in, the chats you picked and your quick replies. Signing out removes the sign-in.

They are kept in the Even Realities app's storage for this app, and in the web view's own storage as a second copy.

## Kept by us

Nothing. The relay stores nothing and keeps no log of what it is sent.

There are no accounts with us, no analytics and no advertising. The app connects to two places only, both listed
in `app.json`: Telegram and the relay.

## Sent in your name

Only what you tapped. A message, a like or a save happens after the glasses showed it and you tapped, never on the
word of an AI model.

## Questions

Open an issue at <https://github.com/jarekbird/paper-plane/issues>.
