const ASKS = /\?\s*$|^(can|could|are|is|do|does|did|will|would|shall|should|have|has)\b/i
const THANKS = /\b(thanks|thank you|thx|cheers)\b/i
const MOST = 3

const RULES: { fits: (text: string) => boolean; answers: readonly string[] }[] = [
  { fits: text => ASKS.test(text), answers: ['Yes', 'No', 'Let me check'] },
  { fits: text => THANKS.test(text), answers: ['You are welcome', 'Anytime', 'Glad to help'] },
]
const OTHERWISE: readonly string[] = ['OK', 'Thanks', 'On my way']

export function quickReplies(incoming: string | null, own: readonly string[]): string[] {
  const text = incoming?.trim() ?? ''
  const fixed = (RULES.find(rule => rule.fits(text))?.answers ?? OTHERWISE).slice(0, MOST)
  const seen = new Set(fixed.map(answer => answer.toLowerCase()))
  const extra = own
    .map(phrase => phrase.trim())
    .filter(phrase => phrase && !seen.has(phrase.toLowerCase()) && seen.add(phrase.toLowerCase()))
  return [...fixed, ...extra]
}
