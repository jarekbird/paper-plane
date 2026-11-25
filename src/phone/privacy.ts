export interface Leaving {
  heading: string
  text: string
}

export interface Build {
  telegram: boolean
  voice: boolean
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
      heading: 'Kept on this phone',
      text: 'Your Telegram sign-in, the chats you picked and your quick replies. Signing out removes the sign-in.',
    },
    {
      heading: 'Kept by us',
      text: 'Nothing. The relay stores nothing and keeps no log of what it is sent.',
    },
    {
      heading: 'Sent in your name',
      text: 'Only what you tapped. A message, a like or a save happens after the glasses showed it and you tapped, never on the word of an AI model.',
    },
  ]
}
