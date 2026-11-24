import type { Lifetime } from 'earshot'

declare const messenger: { send(chat: string, text: string): Promise<void> }

export async function inATest(life: Lifetime) {
  void life
  await messenger.send('chat', 'text')
}
