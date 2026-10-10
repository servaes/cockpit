// Run the band's own patterns (lifted verbatim from register.tsx, same JS regex engine) over the
// person's past prompts: how many land in each kind, samples per kind, and the leftovers.
import { readFileSync } from 'node:fs'
const [, , tsx, promptsFile, perKind = '10', leftovers = '60'] = process.argv
const src = readFileSync(tsx, 'utf8')
const grab = (start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a); return src.slice(a, b) }
const line = name => src.split('\n').find(l => l.startsWith(`const ${name} =`))
const code = [
  line('MAKE'),
  grab('const KIND_WORDS', '\n]\n') + '\n]',
  line('HELPER_WORDS'), line('APPROVAL'), line('SHORT_REPLY'), line('MANY_PARTS'), line('CONTEXT_WORDS'),
  grab('function profileOf', '\n}\n') + '\n}',
].join('\n').replace(/: \[Kind, RegExp\]\[\]/, '').replace(/\(text: string\): Profile/, '(text)')
const env = new Function(code + `
function kindOf(text) {
  const lower = text.toLowerCase()
  for (const [kind, re] of KIND_WORDS) if (re.test(lower)) return kind
  if (text.length < 300 && HELPER_WORDS.test(lower)) return 'mechanical'
  const profile = profileOf(text)
  return profile === 'build' || profile === 'agents' ? 'build' : profile === 'edit' ? 'fix' : 'quick'
}
return { kindOf, APPROVAL, SHORT_REPLY, profileOf, MANY_PARTS }`)()
const lines = readFileSync(promptsFile, 'utf8').split('\n').filter(l => l && !l.startsWith('Another Claude session') && !l.startsWith('Base directory'))
const by = {}
for (const l of lines) {
  const k = l.length <= env.SHORT_REPLY && env.APPROVAL.test(l) ? 'reply' : env.kindOf(l)
  ;(by[k] ??= []).push(l)
}
let seed = 7
const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
const sample = (xs, n) => [...xs].sort(() => rand() - 0.5).slice(0, n)
for (const k of ['reply', 'risky', 'think', 'image', 'video', 'data', 'doc', 'design', 'text', 'research', 'mechanical', 'build', 'fix', 'quick']) {
  const xs = by[k] ?? []
  console.log(`\n=== ${k}: ${xs.length}`)
  for (const x of sample(xs, k === 'quick' ? Number(leftovers) : Number(perKind))) console.log('  -', x.slice(0, 140))
}
