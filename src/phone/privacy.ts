export interface Leaving {
  heading: string
  text: string
}

export interface Build {
  telegram: boolean
  voice: boolean
  calendar: boolean
}

export function whatLeaves(build: Build): Leaving[] {
  return [
    {
      heading: 'To Telegram',
      text: build.telegram
        ? 'Your sign-in, the chats you open and what you send go straight from this phone to Telegram. No server of ours is in between, and none ever sees them.'
        : 'Nothing. This build has no Telegram in it: the chats you see are samples.',
    },
    {
      heading: 'When you hold to talk',
      text: build.voice
        ? "The sound of that hold goes to Paper Plane's relay. AI models at OpenRouter turn it into words, and the words into an action or a written-out message. Nothing else goes with it: no message, no chat name and no person's name from Telegram."
        : 'Nothing. Voice is not set up in this build.',
    },
    {
      heading: 'To Google',
      text: build.calendar
        ? "Only if you connect Google Calendar. Then your next meeting is read from Google, and a meeting you confirm with a tap is added there with its time and the name of its chat, straight from this phone. The Google sign-in itself passes through Paper Plane's relay when you connect and when it is renewed."
        : 'Nothing. Google Calendar is not set up in this build.',
    },
    {
      heading: 'Kept on this phone',
      text: build.calendar
        ? 'Your Telegram sign-in, the chats you picked, your quick replies and, if you connect it, your Google sign-in. Signing out or disconnecting removes a sign-in.'
        : 'Your Telegram sign-in, the chats you picked and your quick replies. Signing out removes the sign-in.',
    },
    {
      heading: 'Kept by us',
      text: build.calendar
        ? 'Nothing but a Google sign-in on its way to this phone: the relay keeps it for five minutes at most and hands it over once. It keeps no log of what it is sent.'
        : 'Nothing. The relay stores nothing and keeps no log of what it is sent.',
    },
    {
      heading: 'Sent in your name',
      text: 'Only what you tapped. A message, a like, a save or a meeting happens after the glasses showed it and you tapped, never on the word of an AI model.',
    },
  ]
}
