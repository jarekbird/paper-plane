import type { Lifetime } from 'earshot'
import type { Inbox } from '../inbox.ts'
import type { Phrases } from '../phrases.ts'
import { pickRows, setPicked } from './model.ts'
import type { SignIn } from './signin.ts'

export interface PhoneParts {
  inbox: Inbox
  phrases: Phrases
  signIn: SignIn | null
  note: string
}

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const made = document.createElement(tag)
  if (text !== undefined) made.textContent = text
  return made
}

export function startPhone(life: Lifetime, root: HTMLElement, parts: PhoneParts): void {
  const { inbox, phrases, signIn, note } = parts
  const account = element('section')
  let accountRows = life.child()
  const chats = element('section')
  const answers = element('section')
  let chatRows = life.child()
  let answerRows = life.child()

  const drawChats = () => {
    chatRows.end()
    chatRows = life.child()
    const list = element('ul')
    for (const row of pickRows(inbox)) {
      const box = element('input')
      box.type = 'checkbox'
      box.checked = row.picked
      chatRows.listen(box, 'change', () => void setPicked(inbox, row.id, box.checked))
      const label = element('label')
      label.append(box, element('span', row.title), element('small', row.kind))
      const item = element('li')
      item.append(label)
      list.append(item)
    }
    chats.replaceChildren(
      element('h2', 'Chats on your glasses'),
      inbox.all().length ? list : element('p', inbox.problem ?? 'No chats yet.'),
    )
  }

  const drawAnswers = () => {
    answerRows.end()
    answerRows = life.child()
    const list = element('ul')
    for (const phrase of phrases.list()) {
      const remove = element('button', 'Remove')
      answerRows.listen(remove, 'click', () => void phrases.remove(phrase))
      const row = element('div')
      row.className = 'row'
      row.append(element('span', phrase), remove)
      const item = element('li')
      item.append(row)
      list.append(item)
    }
    const field = element('input')
    field.type = 'text'
    field.maxLength = 120
    field.placeholder = 'In a meeting, back at three'
    const add = element('button', 'Add')
    const form = element('form')
    form.append(field, add)
    answerRows.listen(form, 'submit', event => {
      event.preventDefault()
      void phrases.add(field.value)
    })
    answers.replaceChildren(
      element('h2', 'Your quick replies'),
      element('p', 'Short answers you send often. A tap on a chat offers them after Yes, No and the like.'),
      list,
      form,
    )
  }

  const field = (type: string, placeholder: string, autocomplete: AutoFill, numeric = false) => {
    const input = element('input')
    input.type = type
    input.placeholder = placeholder
    input.autocomplete = autocomplete
    if (numeric) input.inputMode = 'numeric'
    return input
  }
  const form = (rows: Lifetime, input: HTMLInputElement, button: string, busy: boolean, submit: (value: string) => void) => {
    const send = element('button', button)
    send.disabled = busy
    const made = element('form')
    made.append(input, send)
    rows.listen(made, 'submit', event => {
      event.preventDefault()
      submit(input.value)
    })
    return made
  }
  const plain = (rows: Lifetime, text: string, busy: boolean, press: () => void) => {
    const button = element('button', text)
    button.type = 'button'
    button.disabled = busy
    rows.listen(button, 'click', press)
    return button
  }

  const drawAccount = () => {
    if (!signIn) return
    accountRows.end()
    accountRows = life.child()
    const rows = accountRows
    const { step, busy, problem, name } = signIn.view()
    const parts: HTMLElement[] = [element('h2', 'Telegram')]
    if (problem) {
      const shown = element('p', problem)
      shown.className = 'problem'
      parts.push(shown)
    }
    if (step === 'checking') parts.push(element('p', 'Checking your sign-in…'))
    if (step === 'offline') parts.push(plain(rows, 'Try again', busy, () => void signIn.retry()))
    if (step === 'phone') {
      parts.push(
        element(
          'p',
          'Sign in to see your own chats. Your number, code and password go straight to Telegram, and the sign-in stays on this phone.',
        ),
        form(rows, field('tel', '+1 555 010 0199', 'tel'), 'Send code', busy, number => void signIn.phone(number)),
      )
    }
    if (step === 'code') {
      parts.push(
        element('p', 'Telegram sent you a code, in your Telegram app or by text message. Type it here.'),
        form(rows, field('text', 'Code', 'one-time-code', true), 'Sign in', busy, code => void signIn.code(code)),
        plain(rows, 'Use another number', busy, () => signIn.another()),
      )
    }
    if (step === 'password') {
      parts.push(
        element('p', 'This account has a password as a second step. Type it here.'),
        form(rows, field('password', 'Password', 'current-password'), 'Sign in', busy, password => void signIn.password(password)),
        plain(rows, 'Use another number', busy, () => signIn.another()),
      )
    }
    if (step === 'in')
      parts.push(
        element('p', `Signed in as ${name ?? 'you'}.`),
        plain(rows, 'Sign out', busy, () => void signIn.signOut()),
      )
    account.replaceChildren(...parts)
  }

  root.replaceChildren(element('h1', 'Paper Plane'), account, element('p', note), chats, answers)
  if (signIn) life.own(signIn.onChange(drawAccount))
  drawAccount()
  life.own(inbox.onChange(drawChats))
  life.own(phrases.onChange(drawAnswers))
  drawChats()
  drawAnswers()
}
