export type ChatKind = 'person' | 'group' | 'channel'

export interface Message {
  id: string
  chat: string
  from: string
  text: string
  at: number
  mine: boolean
  liked: boolean
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
  keep(chat: string, text: string, signal: AbortSignal): Promise<boolean>
  save(message: Message): Promise<void>
  like(message: Message): Promise<void>
  onChange(told: () => void): () => void
}

export type SignInProblem = 'phone' | 'code' | 'expired' | 'password' | 'wait' | 'other'

export class SignInError extends Error {
  readonly problem: SignInProblem

  constructor(problem: SignInProblem) {
    super(problem)
    this.problem = problem
  }
}

export interface Who {
  id: string
  name: string
}

export interface Account {
  known(): Promise<boolean>
  restore(): Promise<Who | null>
  askCode(phone: string, signal: AbortSignal): Promise<Who | 'code'>
  giveCode(code: string, signal: AbortSignal): Promise<Who | 'password'>
  givePassword(password: string, signal: AbortSignal): Promise<Who>
  signOut(): Promise<'told' | 'untold'>
}
