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

## To Google

Only if you connect Google Calendar. Then your next meeting is read from Google, and a meeting you confirm with a
tap is added there with its time and the name of its chat, straight from this phone. The Google sign-in itself
passes through Paper Plane's relay when you connect and when it is renewed.

- Connecting is done in a browser, at Google. The app asks for one thing: to see and change the events of your
  calendars. It reads the next meeting that has a time, and adds only what you confirm.
- Google gives a sign-in only to a server that holds the app's secret, so the relay takes it from Google and shows
  you a six-digit code. Typed into the app within five minutes, the code lets this phone pick the sign-in up, once.
  After that the relay has it no more. About once an hour the phone asks the relay to renew it; the relay passes
  that on to Google and keeps nothing.
- No meeting and no calendar entry goes through the relay or to an AI model.

## Kept on this phone

Your Telegram sign-in, the chats you picked, your quick replies and, if you connect it, your Google sign-in.
Signing out or disconnecting removes a sign-in.

They are kept in the Even Realities app's storage for this app, and in the web view's own storage as a second copy.

## Kept by us

Nothing but a Google sign-in on its way to this phone: the relay keeps it for five minutes at most and hands it
over once. It keeps no log of what it is sent.

There are no accounts with us, no analytics and no advertising. The app connects to three places only, all listed
in `app.json`: Telegram, the relay, and Google once you connect your calendar.

## Sent in your name

Only what you tapped. A message, a like, a save or a meeting happens after the glasses showed it and you tapped,
never on the word of an AI model.

## Questions

Open an issue at <https://github.com/jarekbird/paper-plane/issues>.
