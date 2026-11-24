import type { Lifetime } from 'earshot'
import type { Inbox } from '../inbox.ts'
import { pickRows, setPicked } from './model.ts'

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const made = document.createElement(tag)
  if (text !== undefined) made.textContent = text
  return made
}

export function startPhone(life: Lifetime, root: HTMLElement, inbox: Inbox, note: string): void {
  let rows = life.child()
  const draw = () => {
    rows.end()
    rows = life.child()
    const list = element('ul')
    for (const row of pickRows(inbox)) {
      const box = element('input')
      box.type = 'checkbox'
      box.checked = row.picked
      rows.listen(box, 'change', () => void setPicked(inbox, row.id, box.checked))
      const label = element('label')
      label.append(box, element('span', row.title), element('small', row.kind))
      const item = element('li')
      item.append(label)
      list.append(item)
    }
    root.replaceChildren(
      element('h1', 'Paper Plane'),
      element('p', note),
      element('h2', 'Chats on your glasses'),
      inbox.all().length ? list : element('p', inbox.problem ?? 'No chats yet.'),
    )
  }
  life.own(inbox.onChange(draw))
  draw()
}
