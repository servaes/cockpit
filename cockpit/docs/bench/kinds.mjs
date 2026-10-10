import { readFileSync } from 'node:fs'
const [, , tsx, tasksFile] = process.argv
const src = readFileSync(tsx, 'utf8')
const grab = (start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a); return src.slice(a, b) }
const line = name => src.split('\n').find(l => l.startsWith(`const ${name} =`))
const code = [line('MAKE'), grab('const KIND_WORDS', '\n]\n') + '\n]', line('HELPER_WORDS'), line('APPROVAL'), line('SHORT_REPLY'), line('MANY_PARTS'), line('CONTEXT_WORDS'), grab('function profileOf', '\n}\n') + '\n}']
  .join('\n').replace(/: \[Kind, RegExp\]\[\]/, '').replace(/\(text: string\): Profile/, '(text)')
const env = new Function(code + `
function kindOf(text) { const lower = text.toLowerCase(); for (const [kind, re] of KIND_WORDS) if (re.test(lower)) return kind
  if (text.length < 300 && HELPER_WORDS.test(lower)) return 'mechanical'
  const p = profileOf(text); return p === 'build' || p === 'agents' ? 'build' : p === 'edit' ? 'fix' : 'quick' }
return { kindOf, profileOf, leans: t => CONTEXT_WORDS.test(t.toLowerCase()), parts: t => MANY_PARTS.test(t) }`)()
for (const [i, t] of JSON.parse(readFileSync(tasksFile, 'utf8')).entries()) console.log(`T${i + 1}`, env.kindOf(t), env.profileOf(t), env.leans(t) ? 'leans' : '', env.parts(t) ? 'parts' : '')
