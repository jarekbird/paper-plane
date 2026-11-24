import { Lifetime } from 'earshot'

declare const messenger: { send(chat: string, text: string): Promise<void> }

export async function reply(chat: string, text: string) {
  const life = new Lifetime()
  await messenger.send(chat, text)
  life.end()
}

export async function guarded(life: Lifetime, chat: string, text: string) {
  await life.guard(messenger.send(chat, text))
}
