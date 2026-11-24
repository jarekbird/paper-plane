export type ChatKind = 'person' | 'group' | 'channel'

export interface Message {
  id: string
  chat: string
  from: string
  text: string
  at: number
  mine: boolean
}

export interface Chat {
  id: string
  title: string
  kind: ChatKind
  unread: number
  last: Message | null
}

export interface Messenger {
  chats(): Promise<Chat[]>
  history(chat: string, limit: number): Promise<Message[]>
  send(chat: string, text: string): Promise<Message>
  read(chat: string): Promise<void>
  unsend(message: Message): Promise<void>
  onChange(told: () => void): () => void
}
