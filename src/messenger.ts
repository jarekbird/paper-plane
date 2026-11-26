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

export interface Folder {
  id: string
  title: string
}

export interface Chat {
  id: string
  title: string
  kind: ChatKind
  folders: Folder[]
  unread: number
  mentions: number
  last: Message | null
}

export interface Sponsored {
  id: string
  title: string
  text: string
  link: string
}

export interface Messenger {
  chats(): Promise<Chat[]>
  folders(): Promise<Folder[]>
  history(chat: string, limit: number): Promise<Message[]>
  send(chat: string, text: string, attempt?: object): Promise<Message | null>
  read(chat: string): Promise<void>
  unsend(message: Message): Promise<void>
  keep(chat: string, text: string, signal: AbortSignal): Promise<boolean>
  save(message: Message): Promise<void>
  like(message: Message): Promise<void>
  sponsored(chat: string): Promise<Sponsored | null>
  sawSponsored(sponsored: Sponsored): Promise<void>
  onChange(told: () => void): () => void
}

export type Trouble = { kind: 'unreachable' } | { kind: 'wait'; seconds: number }

export class TroubleError extends Error {
  readonly trouble: Trouble

  constructor(trouble: Trouble) {
    super(trouble.kind)
    this.trouble = trouble
  }
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
  onEnded(told: () => void): () => void
}

export interface Writer {
  write(words: string, signal: AbortSignal): Promise<string>
}

export interface Meeting {
  id: string
  title: string
  start: number
  end: number
}

export interface Calendar {
  next(from: number, signal: AbortSignal): Promise<Meeting | null>
  add(meeting: Omit<Meeting, 'id'>, signal: AbortSignal): Promise<Meeting>
  remove(meeting: Meeting, signal: AbortSignal): Promise<void>
}

export interface CalendarAccount {
  known(): Promise<boolean>
  begin(): Promise<string>
  finish(code: string, signal: AbortSignal): Promise<boolean>
  signOut(): Promise<'ended' | 'here'>
  onChange(told: () => void): () => void
}
