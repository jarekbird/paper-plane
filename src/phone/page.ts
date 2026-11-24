import type { Lifetime } from 'earshot'
import type { Inbox } from '../inbox.ts'
import type { Phrases } from '../phrases.ts'
import { pickRows, setPicked } from './model.ts'

export interface PhoneParts {
  inbox: Inbox
  phrases: Phrases
  note: string
}

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const made = document.createElement(tag)
  if (text !== undefined) made.textContent = text
  return made
}

export function startPhone(life: Lifetime, root: HTMLElement, parts: PhoneParts): void {
  const { inbox, phrases, note } = parts
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

  root.replaceChildren(element('h1', 'Paper Plane'), element('p', note), chats, answers)
  life.own(inbox.onChange(drawChats))
  life.own(phrases.onChange(drawAnswers))
  drawChats()
  drawAnswers()
}
