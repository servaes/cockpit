import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code/testing'
import { cardSvg } from './board-svg'

const SURFACES = ['terminal', 'desktop'] as const
const ROOT = '/tmp/project'
const NOW_MS = 600_000
const H = 3600_000

const PANE_PROPS = {
  title: 'Cockpit Board',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
}

// The session resets in 3 h (so 40% of its 5 h has gone by), the week in 1 d 2 h (85% of it gone).
const USAGE = {
  startedAt: 0,
  context: { tokens: 24_000, window: 200_000, percent: 12 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 5, resetsAt: new Date(NOW_MS + 3 * H).toISOString() },
    { kind: 'seven_day', percentUsed: 41.2, resetsAt: new Date(NOW_MS + 26 * H).toISOString() },
    { kind: 'seven_day_fable', percentUsed: 38, resetsAt: new Date(NOW_MS + 26 * H).toISOString() },
  ],
}

const RUNS = [
  { id: 'a1', type: 'Explore', description: 'Find the login code', model: 'claude-haiku-5-5', status: 'done', startedAt: 10_000, endedAt: 40_000, tokens: 12_000, costUsd: 0.03, steps: 3, round: 1, contextTokens: 0, contextMax: 0 },
  { id: 'a2', type: 'general-purpose', description: 'Write the tests', model: 'claude-sonnet-5-5', status: 'running', startedAt: 50_000, tokens: 30_000, costUsd: 0.2, steps: 2, round: 1, contextTokens: 0, contextMax: 0 },
]

type Dirs = Record<string, [string, 'file' | 'dir'][]>
const DIRS: Dirs = {
  [ROOT]: [['src', 'dir'], ['README.md', 'file'], ['notes.md', 'file']],
  [`${ROOT}/src`]: [['a.ts', 'file']],
  [`${ROOT}/build`]: [['a.js', 'file'], ['b.js', 'file']],
}

type ForkAnswer = { text?: string; read: number; write: number; out?: number }
type World = { rmReport?: string; codexPath?: string; usage?: unknown; dirs?: Dirs; files?: Record<string, string>; opens?: unknown[]; toasts?: string[]; logs?: string[]; writes?: { path: string; text: string }[]; copied?: string[]; entered?: string[]; forks?: string[]; forkAnswers?: ForkAnswer[]; ran?: string[][]; gate?: () => Promise<void>; agents?: unknown[]; flow?: unknown; pricing?: string; draft?: { text: string }; store?: Record<string, unknown>; model?: { id: string }; fills?: string[]; surfaces?: string[] }

// The world beneath the mod: the session's figures, a small project on disk, no git repo, no fonts, no theme.
function world(on: On, w: World = {}) {
  const usage = w.usage ?? USAGE
  const dirs = w.dirs ?? DIRS
  mock.env(on, { HOME: '/home/t' })
  const clock = mock.clock(on, { now: NOW_MS })
  mock.store(on, w.store)
  on('session.start', async (_$, e) => ({ cwd: (e as { cwd: string }).cwd }))
  // Seeded state for the agents and the flow, as savvy-progress would have written it; the rest is the kit's own store.
  on('state.get', async (_$, e, next) => {
    const ref = (e as { ref?: { plugin?: string; key?: string } }).ref ?? (e as { plugin?: string; key?: string })
    if (ref.plugin === 'cockpit' && ref.key === 'agents' && w.agents) return { value: { value: w.agents, version: 1 } } as never
    if (ref.plugin === 'cockpit' && ref.key === 'now' && w.agents) return { value: { value: 100_000, version: 1 } } as never
    if (ref.plugin === 'cockpit' && ref.key === 'flow' && w.flow) return { value: { value: w.flow, version: 1 } } as never
    return next(e)
  })
  on('session.usage', async () => ({ value: usage }) as never)
  on('session.id', async () => ({ value: 's1' }) as never)
  on('session.surfaces', async () => ({ value: w.surfaces ?? ['terminal'] }) as never)
  on('session.attach', async (_$, e) => ({ clientId: (e as { clientId: string }).clientId }) as never)
  on('session.cwd', async () => ({ value: ROOT }) as never)
  on('settings.read', async () => ({ value: {} }) as never)
  on('ui.toast', async (_$, e) => {
    w.toasts?.push(String((e as { text?: string }).text ?? ''))
    return { value: undefined } as never
  })
  on('ui.open', async (_$, e) => {
    w.opens?.push(e)
    return { value: { isPlaced: true } } as never
  })
  on('command.register', async (_$, e) => ({ value: { command: (e as { name?: string }).name } }) as never)
  on('command.list', async () => ({ value: [] }) as never)
  on('tool.register', async (_$, e) => ({ value: { tool: `mcp__cockpit__${(e as { name?: string }).name}` } }) as never)
  on('fs.write', async (_$, e) => {
    w.writes?.push({ path: String((e as { path?: string }).path), text: String((e as { text?: string }).text ?? '') })
    return { value: undefined } as never
  })
  on('fs.exists', async () => ({ value: false }) as never)
  on('fs.read', async (_$, e) => {
    const path = String((e as { path?: string }).path)
    if (w.files && path in w.files) return { value: w.files[path] } as never
    throw new Error('no such file: ' + path)
  })
  on('fs.list', async (_$, e) => {
    const path = String((e as { path?: string }).path)
    const kids = dirs[path]
    if (!kids) throw new Error(`ENOENT ${path}`)
    return { value: kids.map(([name, kind]) => ({ name, kind, size: 1, mtimeMs: 1_700_000_000_000, isLink: false })) } as never
  })
  on('fs.stat', async (_$, e) => {
    const path = String((e as { path?: string }).path)
    if (dirs[path]) return { value: { kind: 'dir', size: 0, mtimeMs: 1_700_000_000_000, isLink: false } } as never
    const parent = path.slice(0, path.lastIndexOf('/'))
    const name = path.slice(path.lastIndexOf('/') + 1)
    const hit = dirs[parent]?.find(([n]) => n === name)
    if (!hit) throw new Error(`ENOENT ${path}`)
    return { value: { kind: hit[1], size: 1, mtimeMs: 1_700_000_000_000, isLink: false } } as never
  })
  on('process.run', async (_$, e) => {
    const argv = ((e as { argv?: string[] }).argv ?? []) as string[]
    w.ran?.push(argv)
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never
    if (argv[0] === 'sleep') {
      if (w.gate) await w.gate()
      return ok('')
    }
    if (argv[0] === 'sh' && String(argv[2] ?? '').includes('command -v codex')) return ok(w.codexPath ? `${w.codexPath}\n` : '')
    if (argv[0] === 'sh') return ok('missing\n')
    if (argv[0] === 'uname') return ok('Linux\n')
    if (argv[0] === 'git') return { value: { exitCode: 128, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false } } as never
    // the guard's measuring script for rm: "<files> <bytes> <paths>" then the files
    if (argv[0] === 'bash' && String(argv[2] ?? '').includes('compgen')) return ok(w.rmReport ?? '2 2048 1\n./build/a.js\n./build/b.js\n')
    if (argv[0] === 'bash') return ok('2 2048 1\n./build/a.js\n./build/b.js\n')
    return ok('')
  })
  on('prompt.submit', async (_$, e) => {
    w.entered?.push((e as { text: string }).text)
    return { text: (e as { text: string }).text, context: (e as { context?: string[] }).context } as never
  })
  on('session.model', async () => ({ value: w.model?.id ?? 'claude-fable-5-1' }) as never)
  on('prompt.fill', async (_$, e) => {
    w.fills?.push(String((e as { text?: string }).text ?? ''))
    return { isFilled: true } as never
  })
  // The prompt box as the person types in it, and the engine's empty band beneath the plugins
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('prompt.read', async () => ({ value: { text: w.draft?.text ?? '', cursor: (w.draft?.text ?? '').length } }) as never)
  // Anthropic's pricing page: offline unless a test hands one in, so the built-in table prices the rest.
  on('http.fetch', async () => ({ value: w.pricing ? { status: 200, ok: true, headers: {}, text: w.pricing } : { status: 503, ok: false, headers: {}, text: '' } }) as never)
  on('prompt.compose', async () => ({ sections: [] }) as never)
  on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
  on('command.run', { command: 'goal' }, async () => ({}) as never)
  on('turn.complete', async (_$, e) => ({ text: (e as { answer: string }).answer }) as never)
  on('classic.SessionStart', async () => ({}) as never)
  on('ui.log', async (_$, e) => {
    w.logs?.push(String((e as { text?: string }).text ?? ''))
    return { value: undefined } as never
  })
  on('ui.copy', async (_$, e) => {
    w.copied?.push(String((e as { text?: string }).text ?? ''))
    return { value: { isCopied: true } } as never
  })
  on('model.fork', async (_$, e) => {
    w.forks?.push(String((e as { prompt?: string }).prompt ?? ''))
    const a = w.forkAnswers?.shift()
    const usage = a ? { input_tokens: 2, output_tokens: a.out ?? 1, cache_read_input_tokens: a.read, cache_creation_input_tokens: a.write } : { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
    if (!a) return { value: { isAnswered: false, reason: 'nothing-to-fork', usage } } as never
    return { value: { isAnswered: true, text: a.text ?? 'warm', usage } } as never
  })
  return clock
}

const start = { cwd: ROOT, surface: 'desktop' as const, isInteractive: true }
const mount = ($: any, surface: 'terminal' | 'desktop') =>
  $.ui.mount({ plugin: 'cockpit', surface, component: 'Pane', requestId: 'cockpit', props: PANE_PROPS })

// A plan through the goal meter's own tool: three tasks, the first one done.
async function plan($: any) {
  await $.tool.call({ tool: 'mcp__cockpit__tasks', action: 'plan', tasks: [{ title: 'Ship the landing page', size: 'S' }, { title: 'Wire the form', size: 'L' }, { title: 'Deploy', size: 'M' }] })
  await $.tool.call({ tool: 'mcp__cockpit__tasks', action: 'done', id: 1 })
}

for (const surface of SURFACES) {
  const word = (w: string) => (surface === 'terminal' ? `"${w}"` : `>${w}<`)
  test(`${surface}: every section above the tree, in order, with the tree told its remaining rows`, async ($, on) => {
    const clock = world(on, { agents: RUNS })
    await $.session.start(start)
    await clock.settle()
    await plan($)

    const ui = await mount($, surface)
    await clock.settle()
    const text = JSON.stringify(await ui.drawn())
    const rows = JSON.stringify(await ui.drawn({ in: 'rows' }))

    const order = ['Session', 'Week', 'THIS CHAT', 'Context', 'Cache', 'Goals', 'Progress', 'Agents', 'Needs you', 'CHANGES', 'File Changes', '▶ See code changes', '◫ See visual changes', word('Ship')]
    for (let i = 1; i < order.length; i++) expect(text.indexOf(order[i - 1])).toBeLessThan(text.indexOf(order[i]))
    // no USAGE header, no per-model week bar, no Skills part
    expect(text).not.toContain('USAGE')
    expect(text).not.toContain('Fable wk')
    expect(text).not.toContain('Skills')
    // this chat's goal fills Progress and Goals
    expect(text).toContain(word('goal'))
    expect(text).toContain('Ship the landing page · 1/3 tasks')
    expect(text).toContain(word('running'))
    expect(text).toContain('☀ Clear')
    expect(text).toContain('↳ Plenty of room. Work as normal.')
    expect(text).toContain('41%')
    expect(text).toContain('1 running · 1 done')
    expect(text).toContain('Write the tests')
    // each window says when it resets and how long that is, then what that means
    expect(text).toContain('(in 3h)')
    expect(text).toContain('(in 1d2h)')
    // the desktop's usage rows say how long and when: `↻ 3h (at 3:10)`, `↻ 1d2h (Fri 2:10)`
    if (surface === 'desktop') expect(text).toMatch(/↻ 3h \(at \d{1,2}:\d{2}\)/)
    if (surface === 'desktop') expect(text).toMatch(/↻ 1d2h \((Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2}:\d{2}\)/)
    expect(text).toContain('↳ 40% of the session gone, 5% used · room to spare')
    expect(text).toContain('↳ 85% of the week gone, 41% used · room to spare')
    expect(text).toContain('nothing waiting')
    expect(text).toContain('0 changed this session')
    expect(text).toContain('nothing to ship')
    expect(text).not.toContain('▶ Ship it')
    expect(text).toContain("no edits yet (steps through this chat's changes once there are some)")
    // the tree follows, drawn by the mod itself: the project's files and the search box
    expect(text).toContain('"placeholder":"search files"')
    expect(rows).toContain('README.md')
    expect(rows).toContain('notes.md')
    // session + hint + week + hint + blank + rule + THIS CHAT + rule + context + hint + rule + cache (no size line before a reply) + 2 buttons + rule
    // + progress + rule + 1 goal + rule + agents head + 2 agents + rule + crew chats + rule + caution + rule + files head + replay = 29 rows, so the tree keeps 11
    if (surface === 'terminal') expect(text).toContain('"minHeight":6')
    // the desktop's cards are measured in pixels: the tree still keeps its floor of five rows
    else expect(Number(/"minHeight":(\d+)/.exec(text)?.[1])).toBeGreaterThanOrEqual(5)
    expect(text).not.toContain('Tree buttons')
  })

  test(`${surface}: says so when there is nothing to show`, async ($, on) => {
    const clock = world(on, { usage: { ...USAGE, rateLimits: [], context: { tokens: 0, window: 0, percent: 0 } } })
    await $.session.start(start)
    await clock.settle()

    const ui = await mount($, surface)
    await clock.settle()
    const text = JSON.stringify(await ui.drawn())

    expect(text).toContain("fills by itself from Claude's task list as it works")
    expect(text).toContain('no reading')
    expect(text).toContain('none yet')
    expect(text).toContain("↳ No reading yet. It shows after Claude's first reply.")
    expect(text).not.toContain('of the week gone')
    // usage none + blank + rule + THIS CHAT + rule + context + hint + rule + cache + 2 buttons + rule + progress + rule + goals
    // + the Create goal box + rule + agents + rule + crew chats + rule + caution + rule + files head + replay = 25 rows, so the tree keeps 15
    if (surface === 'terminal') expect(text).toContain('"minHeight":10')
    else expect(Number(/"minHeight":(\d+)/.exec(text)?.[1])).toBeGreaterThanOrEqual(5)
    expect(text).toContain('what does done look like?')
  })
}

test('the pane opens as the Cockpit Board at session start', async ($, on) => {
  const opens: { id?: string; title?: string }[] = []
  const clock = world(on, { opens })
  await $.session.start(start)
  await clock.settle()
  expect(opens.some(o => o.id === 'cockpit' && o.title === 'Cockpit Board')).toBe(true)
})

test('a crew run takes the Progress row over the goal', async ($, on) => {
  const clock = world(on, { agents: RUNS, flow: {
    title: 'Build the signup page', total: 4, done: 3, running: 1, phase: 'delegate', isFinished: false,
    tasks: [
      { title: 'Find the login code', tier: 'light', after: [] },
      { title: 'Write the tests', tier: 'medium', after: [1] },
      { title: 'Design the page', tier: 'fable', after: [] },
    ],
  } })
  await $.session.start(start)
  await clock.settle()
  await plan($)
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Tasks 3/4')
  expect(text).toContain('75%')
  expect(text).toContain('● Build the signup page · ×3 · 1 running')
  expect(text).toContain('1. Find the login code')
  expect(text).toContain('2. Write the tests')
  expect(text).toContain('3. Design the page')
  expect(text).toContain('crew-fable · Fable · high')
  // 3 of 4 tasks done since the first worker started: the last one should take a third of that
  expect(text).toMatch(/left \(at \d{1,2}:\d{2}\)/)
  expect(text.indexOf('Ship the landing page')).toBeGreaterThan(text.indexOf('"Goals"'))
})

test("fills Progress from Claude's own todo list, no command needed", async ($, on) => {
  const clock = world(on)
  const todos = [
    { content: 'Read the config', status: 'completed', activeForm: 'Reading the config' },
    { content: 'Write the tests', status: 'in_progress', activeForm: 'Writing the tests' },
    { content: 'Run the suite', status: 'pending', activeForm: 'Running the suite' },
  ]
  on('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: todos } }) as never)
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'TodoWrite', todos } as never)
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Tasks 1/3')
  expect(text).toContain('33%')
  expect(text).toContain('● Writing the tests')
  expect(text).toContain('2. Write the tests')
})

test("fills Progress from Claude's task tracker, one task at a time", async ($, on) => {
  const clock = world(on)
  let n = 0
  on('tool.call', { tool: 'TaskCreate' }, async (_$, e) => ({ result: { task: { id: `t${++n}`, subject: (e as { subject: string }).subject } } }) as never)
  on('tool.call', { tool: 'TaskUpdate' }, async (_$, e) => ({ result: { success: true, taskId: (e as { taskId: string }).taskId, updatedFields: ['status'] } }) as never)
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'TaskCreate', subject: 'Write the API', description: 'x', activeForm: 'Writing the API' } as never)
  await $.tool.call({ tool: 'TaskCreate', subject: 'Deploy it', description: 'y' } as never)
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't1', status: 'completed' } as never)
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Tasks 1/2')
  expect(text).toContain('50%')
  expect(text).toContain('◷ next task not started yet')
})

test('a nearly spent window says so and when it comes back', async ($, on) => {
  const clock = world(on, { usage: { ...USAGE, rateLimits: [
    { kind: 'five_hour', percentUsed: 93, resetsAt: new Date(NOW_MS + 25 * 60_000).toISOString() },
    { kind: 'seven_day', percentUsed: 65, resetsAt: new Date(NOW_MS + 2 * 24 * H).toISOString() },
  ] } })
  await $.session.start(start)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('near cap')
  expect(text).toContain('(in 25m)')
  expect(text).toContain('(in 2d)')
  expect(text).toMatch(/↳ Nearly spent \(93%\) · back \w{3} \d{1,2}:\d{2} [AP]M \(in 25m\)/)
  // the week: 2 of 7 days left, so 71% gone against 65% used, within 10 points
  expect(text).toContain('↳ 71% of the week gone, 65% used · right on pace')
})

test('counts the files Claude changes for the Files header', async ($, on) => {
  const clock = world(on)
  on('tool.call', { tool: 'Edit' }, async () => ({ result: 'ok' }) as never)
  on('tool.call', { tool: 'Write' }, async () => ({ result: 'ok' }) as never)
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/a.ts`, old_string: 'x', new_string: 'y' } as never)
  await $.tool.call({ tool: 'Write', file_path: `${ROOT}/b.ts`, content: 'z' } as never)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/a.ts`, old_string: 'y', new_string: 'w' } as never)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('2 changed this session')
  expect(text).toContain('· src/a.ts')
  expect(text).toContain('· b.ts')
  expect(text).toContain('"label":"▶ See code changes"')
  // Ship it shows only once files changed, like the guard shows only when something is held
  expect(text).toContain('"label":"▶ Ship it"')
  expect(text).toContain('not live yet')
  await $.turn.complete(turn())
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain("3 edits (steps through this chat's changes, one at a time)")
  // Replay is a plain button, the same as Keep warm and Handoff (Ship it is the one primary button of CHANGES)
  expect(text).not.toContain('"label":"▶ See code changes","variant":"primary"')
})

test('holds a risky command inside the Cockpit until Cancel is pressed, then lists it', async ($, on) => {
  let release: () => void = () => undefined
  const gate = new Promise<void>(r => { release = r })
  const clock = world(on, { gate: () => gate })
  let ran = 0
  on('tool.call', { tool: 'Bash' }, async () => { ran += 1; return { result: { stdout: 'ran', stderr: '', exitCode: 0 } } as never })
  await $.session.start(start)
  await clock.settle()

  const call = $.tool.call({ tool: 'Bash', command: 'rm -rf ~/Documents/build' } as never)
  await clock.settle()
  const ui = await mount($, 'desktop')
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Held: rm -rf')
  expect(text).toContain('delete 2 files (about 2.0 KB)')
  expect(text).toContain('build/a.js')
  expect(text).toContain('act now')
  expect(text).toContain('Proceed or Cancel below')

  await ui.press({ key: 'blast:cancel' })
  release()
  const r = await call
  expect(String((r as { deny?: string }).deny)).toContain('the user pressed Cancel')
  expect(ran).toBe(0)

  text = JSON.stringify(await ui.drawn())
  expect(text).not.toContain('Held: rm -rf')
  expect(text).toContain('nothing waiting · 1 solved this chat')
})

test("a here-document's body is the command's input, not commands: rm -rf inside one is not held", async ($, on) => {
  // each held call waits on its own gate, opened once Cancel is pressed, as in the hold test above
  let release: () => void = () => undefined
  let gate: Promise<void> = Promise.resolve()
  const hold = () => { gate = new Promise<void>(r => { release = r }) }
  const clock = world(on, { gate: () => gate })
  let ran = 0
  on('tool.call', { tool: 'Bash' }, async () => { ran += 1; return { result: { stdout: 'ran', stderr: '', exitCode: 0 } } as never })
  await $.session.start(start)
  await clock.settle()
  const script = "python3 -I - hooks/x.ts <<'EOF'\nRISKY = r'\\b(rebase|deploy)\\b|rm -rf'\nprint('ok')\nEOF\necho done"
  const r = await $.tool.call({ tool: 'Bash', command: script } as never)
  expect((r as { deny?: string }).deny).toBeUndefined()
  expect(ran).toBe(1)
  const ui = await mount($, 'desktop')
  expect(JSON.stringify(await ui.drawn())).not.toContain('Held:')
  // what Codex's second opinion found: each of these still hides a real rm -rf, so each is held
  for (const command of [
    'cat <<EOF\n$(rm -rf ~/Documents/build)\nEOF',
    "echo '<<EOF'\nrm -rf ~/Documents/build",
    'cat <<A <<B\nfirst\nA\nrm -rf ~/Documents/build\nB',
    'cat <<<EOF\nrm -rf ~/Documents/build',
    'echo $(rm -rf ~/Documents/build)',
    'echo `rm -rf ~/Documents/build`',
  ]) {
    hold()
    const call = $.tool.call({ tool: 'Bash', command } as never)
    await clock.settle()
    expect(JSON.stringify(await ui.drawn()), command).toContain('Held: rm -rf')
    await ui.press({ key: 'blast:cancel' })
    release()
    await call
  }
  // a literal body with a second literal here-document after it: both bodies are input
  const two = await $.tool.call({ tool: 'Bash', command: "cat <<'A' <<'B'\nrm -rf x\nA\nrm -rf y\nB\necho ok" } as never)
  expect((two as { deny?: string }).deny).toBeUndefined()
  // the same words outside a here-document are still a risk
  hold()
  const held = $.tool.call({ tool: 'Bash', command: 'rm -rf ~/Documents/build' } as never)
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).toContain('Held: rm -rf')
  await ui.press({ key: 'blast:cancel' })
  release()
  await held
})

test('a small rm where losing it costs nothing runs without a hold; bypass mode raises the bar; a top folder is always held', async ($, on) => {
  // a held call waits on its gate, opened after each try, as in the hold test above
  let release: () => void = () => undefined
  let gate: Promise<void> = Promise.resolve()
  const w = { rmReport: '2 2048 1\n./build/a.js\n./build/b.js\n', gate: () => gate }
  const clock = world(on, w)
  let ran = 0
  on('tool.call', { tool: 'Bash' }, async () => { ran += 1; return { result: { stdout: 'ran', stderr: '', exitCode: 0 } } as never })
  // the engine's answer to the classic prompt hook: nothing to add
  on('classic.UserPromptSubmit', async () => ({}) as never)
  await $.session.start(start)
  await clock.settle()
  const ui = await mount($, 'desktop')
  const runs = async (command: string) => {
    const before = ran
    gate = new Promise<void>(r => { release = r })
    const call = $.tool.call({ tool: 'Bash', command } as never)
    await clock.settle()
    const heldNow = JSON.stringify(await ui.drawn()).includes('Held: rm')
    if (heldNow) await ui.press({ key: 'blast:cancel' })
    release()
    await call
    return !heldNow && ran === before + 1
  }
  // inside the project, two small files: runs; nothing to delete: runs
  expect(await runs('rm -rf build')).toBe(true)
  w.rmReport = '0 0 0\n'
  expect(await runs('rm -rf ~/Documents/old')).toBe(true)
  w.rmReport = '1 0 1\n'
  expect(await runs('rm -rf /tmp/x')).toBe(true)
  // outside the project, small: held in the default mode
  w.rmReport = '3 4096 1\n./a\n./b\n./c\n'
  expect(await runs('rm -rf ~/Documents/build')).toBe(false)
  // inside the project but big: held
  w.rmReport = '400 4096 1\n'
  expect(await runs('rm -rf build')).toBe(false)
  // what Codex's review of the gentler guard found: each still deletes outside the project, so each is held
  w.rmReport = '0 0 0\n'
  expect(await runs('rm -f /tmp/nothing; rm -rf ~/Documents/build')).toBe(false)
  w.rmReport = '2 2048 1\n./build/a.js\n./build/b.js\n'
  expect(await runs("bash <<'EOF'\nrm -rf ~/Documents/build\nEOF")).toBe(false)
  expect(await runs('command -- rm -rf ~/Documents/build')).toBe(false)
  expect(await runs("r''m -rf ~/Documents/build")).toBe(false)
  expect(await runs('false && cd /tmp; rm -rf build')).toBe(false)
  // in bypass mode the same two run, a huge one is still held, and so is a top folder
  await $.classic.UserPromptSubmit({ prompt: 'x', permission_mode: 'bypassPermissions' } as never)
  w.rmReport = '3 4096 1\n./a\n./b\n./c\n'
  expect(await runs('rm -rf ~/Documents/build')).toBe(true)
  w.rmReport = '400 4096 1\n'
  expect(await runs('rm -rf build')).toBe(true)
  w.rmReport = '50000 9000000000 1\n'
  expect(await runs('rm -rf build')).toBe(false)
  w.rmReport = '3 4096 1\n'
  expect(await runs('rm -rf ~/Documents')).toBe(false)
  expect(await runs('rm -rf ~')).toBe(false)
  // a target the shell expands was measured as written ("nothing to delete"): held in any mode
  w.rmReport = '0 0 0\n'
  expect(await runs('rm -rf $HOME')).toBe(false)
  expect(await runs('rm -rf "$D"')).toBe(false)
  expect(await runs('rm -rf ~root')).toBe(false)
  // the ones let through are not counted as solved on the board
  expect(JSON.stringify(await ui.drawn())).not.toContain('9 solved')
})

test('/cockpit <path> pins another folder in the same pane', async ($, on) => {
  const opens: { id?: string; title?: string }[] = []
  const clock = world(on, { opens })
  await $.session.start(start)
  await clock.settle()
  const r = await $.command.run({ command: 'cockpit', args: 'src', origin: { kind: 'person' }, presentation: { isFullscreen: true, columns: 200 } } as never)
  await clock.settle()
  expect(String((r as { text?: string }).text)).toContain(`Cockpit Board on ${ROOT}/src.`)
  expect(opens.filter(o => o.id === 'cockpit').length).toBeGreaterThan(1)
  const ui = await mount($, 'desktop')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn({ in: 'rows' }))).toContain('a.ts')
})

test('/cockpit opens the board in the desktop app, which has no fullscreen layout to ask for', async ($, on) => {
  const opens: { id?: string }[] = []
  const clock = world(on, { opens, surfaces: ['desktop'] })
  await $.session.start(start)
  await clock.settle()
  const before = opens.length
  const r = await $.command.run({ command: 'cockpit', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  await clock.settle()
  expect(String((r as { text?: string }).text)).toContain('Cockpit Board on')
  expect(opens.slice(before).some(o => o.id === 'cockpit')).toBe(true)
})

test('/cockpit says plainly when the session has no screen to draw on', async ($, on) => {
  const clock = world(on, { surfaces: [] })
  await $.session.start({ ...start, surface: null } as never)
  await clock.settle()
  const r = await $.command.run({ command: 'cockpit', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  expect(String((r as { text?: string }).text)).toContain('no screen attached')
})

test('the board opens when the desktop app attaches to a session that began without it', async ($, on) => {
  const opens: { id?: string }[] = []
  const clock = world(on, { opens, surfaces: [] })
  await $.session.start({ ...start, surface: null } as never)
  await clock.settle()
  const before = opens.length
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' } as never)
  await clock.settle()
  expect(opens.slice(before).some(o => o.id === 'cockpit')).toBe(true)
})

test('the crew progress tool fills the board, never the band above the prompt', async ($, on) => {
  const clock = world(on)
  // nothing else draws a band in this world: the engine's own answer is an empty row
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  await $.session.start(start)
  await clock.settle()
  const r = await $.tool.call({ tool: 'mcp__cockpit__progress', title: 'Build the signup page', total: 2, phase: 'delegate', tasks: [{ title: 'Scaffold', tier: 'light' }, { title: 'Form', tier: 'medium' }] } as never)
  expect(JSON.stringify(r)).toContain('ok: Tasks 0/2')
  // the board's Progress row reads the same flow
  const ui = await mount($, 'desktop')
  await clock.settle()
  const board = JSON.stringify(await ui.drawn())
  expect(board).toContain('Tasks 0/2')
  expect(board).toContain('● Build the signup page · ×2')
  expect(board).toContain('1. Scaffold')
  // the band above the prompt is left to whatever is beneath it
  const band = await $.ui.mount({ plugin: 'cockpit', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 120, hasSurvey: false } as never })
  const text = JSON.stringify(await band.drawn())
  expect(text).not.toContain('band:savvy')
  expect(text).not.toContain('"label":"×2"')
})

test('a goal-meter plan shows on the board, never in the band above the prompt', async ($, on) => {
  const clock = world(on)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'mcp__cockpit__tasks', action: 'plan', tasks: [{ title: 'Write the script', size: 'S' }, { title: 'Run it', size: 'S' }] } as never)
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'cockpit', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 120, hasSurvey: false } as never })
  const text = JSON.stringify(await band.drawn())
  expect(text).not.toContain('band:goal')
  expect(text).not.toContain('Write the script')
})

test('leaves other panes alone', async ($, on) => {
  const clock = world(on)
  on('ui.render', { component: 'Pane', requestId: 'other' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>OTHER</Text>
  })
  await $.session.start(start)
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'cockpit', surface: 'desktop', component: 'Pane', requestId: 'other', props: PANE_PROPS })
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('OTHER')
  expect(text).not.toContain('Session')
})

// --- the cache block: the row above Context, the guard, keepwarm and the handoff note

const MIN = 60_000
const BIG = { ...USAGE, context: { tokens: 200_000, window: 1_000_000, percent: 20 } }
const HANDOFF_DIR = '/home/t/.claude/mods-data/cockpit/handoff'
let turns = 0
const turn = (over: Record<string, unknown> = {}) =>
  ({ answer: 'ok', durationMs: 1000, isAborted: false, turnId: 't' + ++turns, reason: 'answer', usage: { input_tokens: 2, output_tokens: 10, cache_read_input_tokens: 200_000, cache_creation_input_tokens: 500, model: 'claude-fable-5-1' }, ...over }) as never
const prompt = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as never
const handoffWrites = (writes: { path: string; text: string }[]) => writes.filter(x => x.path.startsWith(HANDOFF_DIR))
// The mock clock fires the board's one-second tick on every advance and caps the firings, so long stretches go in steps.
const skip = async (clock: { advance: (ms: number) => Promise<unknown> }, ms: number) => {
  for (; ms > 0; ms -= Math.min(ms, 2 * H)) await clock.advance(Math.min(ms, 2 * H))
}

test('the Cache row sits under Context: warm with the hour draining after a reply, COLD with the price after an idle hour', async ($, on) => {
  const clock = world(on, { usage: BIG })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text.indexOf('"alt":"Cache')).toBeGreaterThan(text.indexOf('"alt":"Context'))
  expect(text.indexOf('"alt":"Cache')).toBeLessThan(text.indexOf('"alt":"Progress'))
  expect(text).toContain('≈ $0.05/ping (a tiny ping every 50m keeps this chat cheap for 6h)')
  // the legend is drawn in the cards' small type, not as a plain text row
  expect(text).toContain('font-size=\\"10.5\\" font-variant-numeric=\\"tabular-nums\\">≈ $0.05/ping (a tiny ping')
  expect(text).toContain('≈ $0.10 (writes the note a new chat starts from)')
  expect(text).toContain('>warm<')
  expect(text).toContain('60:00')
  expect(text).toContain('cold at ')
  // the size and prices sit on their own line under the bar; the state line is gone (the legends say it)
  expect(text).toContain('↳ 200k tokens in the cache · cold re-read ≈ $4.00')
  expect(text).not.toContain('keepwarm off')
  expect(text).not.toContain('handoff by itself')
  expect(text).toContain('♨ Keep warm 6h')
  expect(text).toContain('✎ Handoff now')
  await clock.advance(30 * MIN)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('>30:00<')
  await clock.advance(90 * MIN)
  text = JSON.stringify(await ui.drawn())
  // the board's one scale: cold is "act now", with how long and what it means beside it
  expect(text).toContain('>act now<')
  expect(text).toContain('cold 1h00m · next send re-reads it all')
  expect(text).toContain('↳ 200k tokens in the cache · cold re-read ≈ $4.00')
})

test('a cold send of a big chat is dropped once with its price, the resend goes through and arms three hours of keepwarm', async ($, on) => {
  const entered: string[] = []
  const logs: string[] = []
  const clock = world(on, { usage: BIG, entered, logs })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  await skip(clock, 3 * H)
  const first = await $.prompt.submit(prompt('hi'))
  expect(String((first as { drop?: string }).drop)).toMatch(/cache-tax: the prompt cache went cold 2h00m ago\. Sending this re-writes up to 200,000 tokens at \$20\/MTok = \$4\.00 \(a warm turn would have cost \$0\.05\)\./)
  expect(String((first as { drop?: string }).drop)).toContain('press Handoff on the board')
  expect(entered).toEqual([])
  const second = await $.prompt.submit(prompt('hi'))
  expect((second as { drop?: string }).drop).toBe(undefined)
  expect(entered).toEqual(['hi'])
  // the reply that paid: its write is the miss, and keepwarm holds the cache for three hours
  await $.turn.complete(turn({ usage: { input_tokens: 2, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 200_000, model: 'claude-fable-5-1' } }))
  expect(logs.at(-1)).toContain('cold write of 200k tokens paid ($4.00)')
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('on, 3h00m left')
  expect(text).toContain('■ Stop warming')
  // slash commands, warm sends and small chats never stop
  await $.prompt.submit(prompt('/clear'))
  await $.prompt.submit(prompt('still warm'))
  expect(entered).toEqual(['hi', '/clear', 'still warm'])
})

// Hours of mock time with the warm board mounted: the countdown's redraws need more than the default 5 s.
test('Keep warm arms six hours; the handoff writes itself at 49 minutes and the ping follows at 50 after that', { timeoutMs: 20_000 }, async ($, on) => {
  const forks: string[] = []
  const writes: { path: string; text: string }[] = []
  const logs: string[] = []
  const clock = world(on, { usage: BIG, forks, writes, logs, forkAnswers: [{ text: '## Goal\n- Ship the landing page', read: 200_000, write: 0 }, { read: 200_000, write: 0 }, { read: 200_000, write: 0 }, { read: 200_000, write: 0 }] })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await mount($, 'desktop')
  await clock.settle()
  await ui.press({ key: 'cache:keepwarm' })
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('on, 6h00m left')
  await clock.advance(48 * MIN)
  expect(forks).toEqual([])
  // 49 minutes: the note, written while the cache is warm, which also resets the hour
  await clock.advance(MIN)
  await clock.settle()
  expect(forks.length).toBe(1)
  expect(forks[0]).toContain('Write a handoff note')
  expect(handoffWrites(writes).length).toBe(1)
  expect(handoffWrites(writes)[0].path).toBe(`${HANDOFF_DIR}/s1.md`)
  expect(handoffWrites(writes)[0].text).toContain('cwd: /tmp/project')
  expect(handoffWrites(writes)[0].text).toContain('session: s1')
  expect(handoffWrites(writes)[0].text).toContain('auto: true')
  expect(handoffWrites(writes)[0].text).toContain('## Goal\n- Ship the landing page')
  expect(logs.at(-1)).toContain('handoff note written by itself 49m after the last reply (200k read, $0.05)')
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('note saved')
  expect(text).toContain('(auto)')
  // the ping due at 50 waits for the next idle stretch: 50 minutes after the note
  await clock.advance(MIN)
  expect(forks.length).toBe(1)
  await clock.advance(49 * MIN)
  await clock.settle()
  expect(forks.length).toBe(2)
  expect(forks[1]).toBe('Reply with the single word: warm')
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('last ping $0.05 (on, ')
  // the pings go on every 50 minutes while the window lasts; the note is one per idle stretch
  await clock.advance(2 * H)
  await clock.settle()
  expect(forks.length).toBe(4)
  expect(handoffWrites(writes).length).toBe(1)
  await ui.press({ key: 'cache:keepwarm' })
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('♨ Keep warm 6h')
  expect(text).not.toContain('■ Stop warming')
})

// Hours of mock time with the warm board mounted: the countdown's redraws need more than the default 5 s.
test('the Handoff button writes the note now, copies it, and the cold guard then points at it', { timeoutMs: 20_000 }, async ($, on) => {
  const writes: { path: string; text: string }[] = []
  const copied: string[] = []
  const toasts: string[] = []
  const clock = world(on, { usage: BIG, writes, copied, toasts, forkAnswers: [{ text: '## Goal\n- Ship it\n## Next\n- Deploy', read: 200_000, write: 0 }] })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await mount($, 'desktop')
  await clock.settle()
  await ui.press({ key: 'cache:handoff' })
  await clock.settle()
  expect(handoffWrites(writes).length).toBe(1)
  expect(handoffWrites(writes)[0].text).toContain('auto: false')
  expect(handoffWrites(writes)[0].text).toContain('## Next\n- Deploy')
  expect(copied).toEqual(['## Goal\n- Ship it\n## Next\n- Deploy'])
  expect(toasts.at(-1)).toContain('Handoff note saved and copied (200k read, $0.05)')
  await skip(clock, 3 * H)
  const dropped = await $.prompt.submit(prompt('hi'))
  expect(String((dropped as { drop?: string }).drop)).toContain('run /handoff and paste this chat\'s note')
})

test('no automatic handoff on a small chat, and none once the cache is already cold', async ($, on) => {
  const forks: string[] = []
  const logs: string[] = []
  const clock = world(on, { usage: USAGE, forks, logs, forkAnswers: [{ text: 'note', read: 24_000, write: 0 }] })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn({ usage: { input_tokens: 2, output_tokens: 10, cache_read_input_tokens: 24_000, cache_creation_input_tokens: 500, model: 'claude-fable-5-1' } }))
  await clock.advance(2 * H)
  expect(forks).toEqual([])
  expect(logs.some(l => l.includes('handoff'))).toBe(false)
})

test('/handoff prints the note in the chat, copied, and reuses one that still covers the last reply', { timeoutMs: 20_000 }, async ($, on) => {
  const forks: string[] = []
  const copied: string[] = []
  const clock = world(on, { usage: BIG, forks, copied, forkAnswers: [{ text: '## Goal\n- Ship it\n## Next\n- Deploy', read: 200_000, write: 0 }] })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await mount($, 'desktop')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).not.toContain('Resume')
  const run = () => $.command.run({ command: 'handoff', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  let shown = String(((await run()) as { text?: string }).text)
  expect(shown).toContain("Paste it as a new chat's first message")
  expect(shown).toContain('## Goal\n- Ship it\n## Next\n- Deploy')
  expect(forks.length).toBe(1)
  shown = String(((await run()) as { text?: string }).text)
  expect(shown).toContain('## Next\n- Deploy')
  expect(forks.length).toBe(1)
  expect(copied.length).toBe(2)
})

test('/keepwarm, /cache-tax and /handoff answer from the board\'s own state', async ($, on) => {
  const clock = world(on, { usage: BIG })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const run = (command: string, args: string) => $.command.run({ command, args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  let r = await run('keepwarm', '90m')
  expect(String((r as { text?: string }).text)).toContain('keepwarm on for 1h30m')
  r = await run('cache-tax', '')
  const card = String((r as { text?: string }).text)
  expect(card).toContain('claude-fable-5-1')
  expect(card).toContain('state       warm, 1h00m left')
  expect(card).toContain('context     200,000 tokens')
  expect(card).toContain('cold cost   $4.00 to re-write it (warm turn $0.05)')
  expect(card).toContain('handoff     by itself 49m after the last reply')
  expect(card).toContain('break-even  up to 80 pings')
  r = await run('handoff', 'auto off')
  expect(String((r as { text?: string }).text)).toContain('handoff auto off')
  r = await run('cache-tax', 'guard warn')
  expect(String((r as { text?: string }).text)).toContain('guard set to warn')
  r = await run('keepwarm', 'off')
  expect(String((r as { text?: string }).text)).toBe('keepwarm is off')
})

test('Progress shows the turn in flight (time, steps, the tool running), then how long the last one took', async ($, on) => {
  const clock = world(on)
  on('tool.call', { tool: 'Edit' }, async () => ({ result: 'ok' }) as never)
  await $.session.start(start)
  await clock.settle()
  await $.turn.start({ text: 'fix it', turnId: 't-live' } as never)
  await clock.advance(5 * MIN + 32_000)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/a.ts`, old_string: 'x', new_string: 'y' } as never)
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  // a ticking timer where the state word goes, no sliding bar
  expect(text).toContain('>5:32<')
  expect(text).toContain('working · 0 steps · 1 tool call · Edit · a.ts')
  await $.turn.complete(turn({ turnId: 't-live' }))
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('>idle<')
  expect(text).toContain('last turn took 5:32 (0 steps)')
})

test('a task list gets a time estimate from the tasks finished so far', async ($, on) => {
  const clock = world(on)
  let n = 0
  on('tool.call', { tool: 'TaskCreate' }, async (_$, e) => ({ result: { task: { id: `t${++n}`, subject: (e as { subject: string }).subject } } }) as never)
  on('tool.call', { tool: 'TaskUpdate' }, async (_$, e) => ({ result: { success: true, taskId: (e as { taskId: string }).taskId, updatedFields: ['status'] } }) as never)
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'TaskCreate', subject: 'Write the API', description: 'x' } as never)
  await $.tool.call({ tool: 'TaskCreate', subject: 'Test it', description: 'y' } as never)
  await $.tool.call({ tool: 'TaskCreate', subject: 'Deploy it', description: 'z' } as never)
  await clock.advance(2 * MIN)
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't1', status: 'completed' } as never)
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't2', status: 'in_progress' } as never)
  const ui = await mount($, 'desktop')
  await clock.settle()
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Tasks 1/3')
  // one task took two minutes, two are left
  // how long, then the clock time it should be done by, beside the Progress bar
  expect(text).toMatch(/≈ 4m left \(at \d{1,2}:\d{2}\)/)
})

test('asks Claude, in the system prompt, to keep a task list on long work', async ($, on) => {
  const clock = world(on)
  await $.session.start(start)
  await clock.settle()
  const r = await $.prompt.compose({ model: 'claude-fable-5-1', promptModel: 'claude-fable-5-1', surfaces: ['desktop'], tools: [], outputStyle: null, traits: [] } as never)
  const ids = (r as { sections: { id: string; scope: string; text: string }[] }).sections.map(s => s.id)
  expect(ids).toContain('cockpit:progress')
  const mine = (r as { sections: { id: string; scope: string; text: string }[] }).sections.find(s => s.id === 'cockpit:progress')
  expect(mine?.scope).toBe('session')
  expect(mine?.text).toContain('TaskCreate')
  // on big work it offers /cockpit:crew in a line and waits; it never starts it unasked
  expect(mine?.text).toContain('/cockpit:crew')
  expect(mine?.text).toContain('never start /cockpit:crew on your own')
})

test('the Create goal box starts a goal, then goes away while it runs', async ($, on) => {
  const toasts: string[] = []
  const entered: string[] = []
  const clock = world(on, { toasts, entered })
  await $.session.start(start)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"submitLabel":"Create goal"')
  await ui.input({ key: 'goal:new', text: 'Ship the landing page', kind: 'submit' })
  await clock.settle()
  expect(toasts.at(-1)).toBe('Goal started: Ship the landing page')
  // the box runs /goal as typing it would; the goal starts with that command's turn
  await $.turn.start({ text: '/goal Ship the landing page', turnId: 'g1' } as never)
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Ship the landing page')
  expect(text).toContain('>running<')
  expect(text).not.toContain('"submitLabel":"Create goal"')
})

const OPUS_TURN = { input_tokens: 2, output_tokens: 1000, cache_read_input_tokens: 200_000, cache_creation_input_tokens: 500, model: 'claude-opus-5-5' }

test('the Context line prices the last message and the next one, and the next at the write price once the cache is cold', async ($, on) => {
  const clock = world(on, { usage: BIG })
  await $.session.start(start)
  await clock.settle()
  // Opus 5.5 per MTok: 200k read × $0.20 + 500 written × $8 + 1k out × $20 = $0.064
  await $.turn.complete(turn({ usage: OPUS_TURN }))
  const uis = []
  for (const surface of SURFACES) uis.push(await mount($, surface))
  await clock.settle()
  // warm: 200k context × $0.20 + ~1k out × $20 = $0.06
  for (const ui of uis) expect(JSON.stringify(await ui.drawn())).toContain('200k / 1.0M · Last msg: $0.06 · Next ≈ $0.06')
  await clock.advance(61 * MIN)
  // cold: the whole 200k written again at $8 = $1.60
  for (const ui of uis) expect(JSON.stringify(await ui.drawn())).toContain('200k / 1.0M · Last msg: $0.06 · ⚠ Next ≈ $1.60')
})

test("Last msg counts every call the message set off: the main loop's, its agents', and an agent's still working after the turn", async ($, on) => {
  const clock = world(on, { usage: BIG })
  on('turn.step', async function* (_$, e) {
    const step = e as { turnId: string; index: number; agentId?: string }
    // Opus 5.5: the main call $0.064 (200k read, 500 written, 1k out); an agent's call $0.20 (20k written, 2k out)
    const usage = step.agentId
      ? { input_tokens: 0, output_tokens: 2000, cache_read_input_tokens: 0, cache_creation_input_tokens: 20_000, model: 'claude-opus-5-5' }
      : OPUS_TURN
    return { turnId: step.turnId, index: step.index, answer: '', toolUses: [], stopReason: 'end_turn', usage } as never
  })
  const call = async (agentId?: string) => {
    const s = $.turn.step({ turnId: 't-agents', index: 0, model: 'claude-opus-5-5', messageCount: 1, ...(agentId ? { agentId } : {}) } as never)
    for await (const _ of s) void _
    await s.result
  }
  await $.session.start(start)
  await clock.settle()
  await $.turn.start({ turnId: 't-agents' } as never)
  await call()
  await call('a1')
  await $.turn.complete(turn({ turnId: 't-agents', usage: OPUS_TURN }))
  const ui = await mount($, 'terminal')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).toContain('Last msg: $0.26')
  // the agent keeps working after the turn: its calls still go on that message
  await call('a1')
  await clock.advance(1000)
  expect(JSON.stringify(await ui.drawn())).toContain('Last msg: $0.46')
})

test("the prices come live from Anthropic's pricing page when it answers, over the built-in table", async ($, on) => {
  const pricing = [
    '| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits and refreshes | Output tokens |',
    '| :-- | :-- | :-- | :-- | :-- | :-- |',
    '| Claude Opus 5.5 | $4 / MTok | $5 / MTok | $16 / MTok | $1 / MTok<sup>2</sup> | $40 / MTok |',
    '| Claude Opus 5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |',
  ].join('\n')
  const clock = world(on, { usage: BIG, pricing })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn({ usage: OPUS_TURN }))
  const ui = await mount($, 'terminal')
  await clock.settle()
  // last: 200k × $1 + 500 × $16 + 1k × $40 = $0.248; next: 200k × $1 + 1k × $40 = $0.24
  expect(JSON.stringify(await ui.drawn())).toContain('Last msg: $0.25 · Next ≈ $0.24')
})

const band = ($: any, surface: 'terminal' | 'desktop') =>
  $.ui.mount({ plugin: 'cockpit', surface, component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160 } })

test('above the prompt: what the message being typed will cost on the picked model, by the kind of work it asks for, gone once it is sent', async ($, on) => {
  const draft = { text: '' }
  const clock = world(on, { usage: BIG, draft })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await band($, 'terminal')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).not.toContain('This message')
  // a quick question over a warm 200k chat on Fable 5.1, the model picked and the one that answered
  draft.text = 'o que é isso?'
  await clock.advance(2000)
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"This message "')
  expect(text).toContain('"≈ ","$0.07–$0.22"')
  expect(text).toContain('"Fable 5.1"')
  expect(text).toContain('quick answer, ~1 call (first guess) · ~10 tokens typed')
  expect(text).toContain('"borderStyle":"round"')
  expect(text).not.toContain('looks expensive')
  // asking for agents costs more, and says so
  draft.text = 'usa agentes em paralelo pra refatorar o módulo de pagamentos'
  await clock.advance(2000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('with agents, ~10 calls + 2 agents (first guess)')
  // an idle hour later the cache is cold: the warning says what re-writing the chat adds
  await skip(clock, 61 * MIN)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('⚠ cache cold: $4.00 of it re-writes the chat')
  // sent: the line goes
  draft.text = ''
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).not.toContain('This message')
})

test('the price follows the model picked under the prompt; a pricey message offers to plan it first, and a cheaper model', async ($, on) => {
  const draft = { text: '' }
  const model = { id: 'claude-opus-5-5' }
  const fills: string[] = []
  const clock = world(on, { usage: BIG, draft, model, fills })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn({ usage: OPUS_TURN }))
  const ui = await band($, 'desktop')
  draft.text = 'corrige o bug do login'
  await clock.advance(2000)
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"Opus 5.5"')
  expect(text).not.toContain('re-writes the chat')
  const onOpus = /"≈ ","([^"]+)"/.exec(text)?.[1]
  // a decision in a chat on Opus points to a new chat on Fable: switching here would lose the cache
  draft.text = 'decide a arquitetura do módulo de pagamentos'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ New chat · Fable high (architecture or a decision deserves Fable')
  // handing work down only pays from a dearer chat: on Haiku, mechanical work stays here
  model.id = 'claude-haiku-5-5'
  draft.text = 'roda os testes e lista os que falham'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Here · Haiku low (mechanical work, and this chat is already on Haiku)')
  model.id = 'claude-opus-5-5'
  draft.text = 'corrige o bug do login'
  await clock.advance(2000)
  // Fable picked before sending: dearer, and the switch starts without this chat's cache
  model.id = 'fable'
  await clock.advance(2000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"Fable 5.1"')
  expect(/"≈ ","([^"]+)"/.exec(text)?.[1]).not.toBe(onOpus)
  expect(text).toContain("a new model starts without this chat's cache: $4.00 of it re-writes the chat")
  expect(text).toContain('This looks expensive (up to $')
  expect(text).toContain('on Sonnet 5.5 (/model)')
  // the crew row's Plan puts the ask for a plan before the draft
  await ui.press({ key: 'Plan' })
  expect(fills[0]).toStartWith('Plan first: before changing anything')
  expect(fills[0]).toEndWith('corrige o bug do login')
  draft.text = fills[0]
  await clock.advance(2000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('✓ plan first: Claude answers with a plan and waits for your OK')
  expect(text).not.toContain('This looks expensive')
})

test('the crew row stays above the prompt, typed or not: the draft lights the route it calls for, and each button rewrites the draft or opens a new chat', async ($, on) => {
  const draft = { text: '' }
  const fills: string[] = []
  const ran: string[][] = []
  const toasts: string[] = []
  const clock = world(on, { usage: BIG, draft, fills, ran, toasts })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await band($, 'desktop')
  await clock.settle()
  // nothing typed: the row is there, no route lit, no estimate; Codex is not installed in this world
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('⚑ Crew')
  for (const label of ['Here', 'Helper', 'New chat', 'Crew', 'Plan']) expect(text).toContain(`"label":"${label}"`)
  expect(text).not.toContain('"variant":"primary"')
  expect(text).not.toContain('This message')
  expect(text).toContain('Codex: not installed')
  // mechanical work lights Helper; parallel work lights Crew
  draft.text = 'roda os testes e lista os que falham'
  await clock.advance(2000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"label":"Helper","variant":"primary"')
  expect(text).toContain('→ Helper · Haiku low (mechanical work')
  draft.text = 'usa agentes em paralelo pra refatorar o módulo de pagamentos'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('"label":"Crew","variant":"primary"')
  // mechanical words that lean on this conversation stay here; a build in three listed parts is crew-sized
  draft.text = 'lista as mudanças que você fez acima'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('"label":"Here","variant":"primary"')
  draft.text = 'implementa o onboarding:\n1. página de boas-vindas\n2. formulário de perfil\n3. e-mail de confirmação'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Crew · Opus medium (a build in several parts')
  // the kind of work sets the lane: a decision gets Fable high (this chat is on Fable, so it stays), a rebase plans first,
  // an image needs Codex, a chart names dataviz, research goes to a Sonnet worker with web search
  draft.text = 'decide a arquitetura do módulo de pagamentos'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Here · Fable high (architecture or a decision)')
  draft.text = 'faz o rebase da branch em cima da main'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Plan · Fable high (hard to undo: plan first, then run)')
  draft.text = 'gera um logo pro app'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Here · needs Codex installed (an image)')
  draft.text = 'monta um gráfico da receita por mês'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Here · Sonnet medium · dataviz (a chart)')
  draft.text = 'pesquisa quanto custa o plano Max hoje'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('→ Helper · Sonnet medium · web search (research')
  await ui.press({ key: 'Helper' })
  expect(fills.pop()).toStartWith('Delegate: do this through one cheap subagent (the Agent tool with model "sonnet", using web search)')
  // the same in English
  for (const [text, line] of [
    ['run the tests and list the failing ones', '→ Helper · Haiku low (mechanical work'],
    ['rebase the branch onto main', '→ Plan · Fable high (hard to undo'],
    ['decide the architecture of the payments module', '→ Here · Fable high (architecture or a decision)'],
    ['generate a logo for the app', '→ Here · needs Codex installed (an image)'],
    ['build a chart of revenue by month', '→ Here · Sonnet medium · dataviz (a chart)'],
    ['look up how much the Max plan costs', '→ Helper · Sonnet medium · web search (research'],
    ['use agents in parallel to refactor the payments module', '→ Crew ·'],
    ['implement onboarding:\n1. welcome page\n2. profile form\n3. confirmation email', '→ Crew · Opus medium (a build in several parts'],
    ['list the changes you made above', '→ Here ·'],
    // this person's own words: approvals stay here, "sobe" is a deploy, "cadê" is a search, a bare "logo" is "soon", a question about a button is no research
    ['pode deploy', '→ Here (a short reply)'],
    ['boa, faz o 1 ai', '→ Here (a short reply)'],
    ['sobe isso no site pls', '→ Plan · Fable high (hard to undo'],
    ['cadê o pacote que eu preciso carregar?', '→ Helper · Haiku low (mechanical work'],
    ['deixa o botão logo embaixo do título', '→ Here · Sonnet medium (a fix)'],
    ['mais curto, mais conciso, mais impactante', '→ Here · Sonnet medium · the write-human skill (writing)'],
    ['faz uma landing page nova pro Jesse', '→ Here · Opus high · the design skill'],
    ['o que é esse botão de resume handoff?', '→ Here · Sonnet low (a quick answer)'],
    ['tira essa última frase do vídeo', '→ Here · Opus medium · Remotion (a video)'],
    ['traduz o roteiro pro inglês', '→ Here · Sonnet medium · the write-human skill (writing)'],
    ['pensa aí comigo: vale a pena separar isso em outro mod?', '→ Here · Fable high (architecture or a decision)'],
  ]) {
    draft.text = text
    await clock.advance(2000)
    expect(JSON.stringify(await ui.drawn())).toContain(line)
  }
  draft.text = 'usa agentes em paralelo pra refatorar o módulo de pagamentos'
  await clock.advance(2000)
  // Helper and Crew put their prefix before the draft; Here takes it off again
  await ui.press({ key: 'Helper' })
  expect(fills[0]).toStartWith('Delegate: do this through one cheap subagent')
  expect(fills[0]).toEndWith('refatorar o módulo de pagamentos')
  draft.text = fills[0]
  await clock.advance(2000)
  await ui.press({ key: 'Crew' })
  expect(fills[1]).toBe('/cockpit:crew usa agentes em paralelo pra refatorar o módulo de pagamentos')
  draft.text = fills[1]
  await clock.advance(2000)
  await ui.press({ key: 'Here' })
  expect(fills[2]).toBe('usa agentes em paralelo pra refatorar o módulo de pagamentos')
  // New chat opens the app's new-chat link on the draft, naming the project folder; nothing is sent
  await ui.press({ key: 'New chat' })
  const opened = ran.find(argv => (argv.at(-1) ?? '').startsWith('claude://code/new?'))
  expect(opened).toBeDefined()
  expect(decodeURIComponent(opened!.at(-1)!)).toContain(`First move this chat to ${ROOT} (the change_directory tool); the app opens it with no folder. usa agentes em paralelo`)
  expect(toasts.at(-1)).toContain('click Trust workspace in the app')
  // the Codex switch without a codex command only explains itself
  await ui.press({ key: 'Codex: not installed' })
  expect(toasts.at(-1)).toContain('Codex is not installed here')
})

test('New chat opens a real chat on the draft and the board follows it: found by its marker in the transcript, then its model, cost and last words', async ($, on) => {
  const draft = { text: '' }
  const ran: string[][] = []
  const toasts: string[] = []
  const files: Record<string, string> = {}
  const dirs: Dirs = { ...DIRS, '/home/t/.claude/projects': [['-tmp-project', 'dir']], '/home/t/.claude/projects/-tmp-project': [['s9.jsonl', 'file']] }
  const clock = world(on, { usage: BIG, draft, ran, toasts, files, dirs })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await band($, 'desktop')
  const board = await mount($, 'desktop')
  await clock.settle()
  expect(JSON.stringify(await board.drawn())).toContain('Crew chats none yet')
  draft.text = 'implementa o onboarding inteiro, com telas e e-mails'
  await clock.advance(2000)
  await ui.press({ key: 'New chat' })
  await clock.settle()
  // no handoff note could be written in this world (nothing to fork), so the chat opens on the draft alone, with its marker
  const url = decodeURIComponent(ran.find(argv => (argv.at(-1) ?? '').startsWith('claude://code/new?'))!.at(-1)!)
  const id = /\[crew-chat ([a-z0-9]+)\]/.exec(url)?.[1]
  expect(id).toBeDefined()
  expect(url).toContain(`First move this chat to ${ROOT} (the change_directory tool)`)
  expect(toasts.at(-1)).toContain('click Trust workspace in the app')
  let text = JSON.stringify(await board.drawn())
  expect(text).toContain('implementa o onboarding inteiro')
  expect(text).toContain('waiting for Trust workspace and your Enter in the app')
  // the chat's transcript appears with the marker in its first message: the board binds it and reads its tail
  files['/home/t/.claude/projects/-tmp-project/s9.jsonl'] = [
    JSON.stringify({ type: 'user', message: { role: 'user', content: `First move this chat to ${ROOT}. implementa o onboarding inteiro\n\n[crew-chat ${id}]` } }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: 'Onboarding done: three screens and two e-mails.' }], usage: { input_tokens: 1000, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0, output_tokens: 500 } } }),
  ].join('\n')
  await clock.advance(10_000)
  await clock.settle()
  text = JSON.stringify(await board.drawn())
  expect(text).toContain('Sonnet 5.5')
  expect(text).toContain('Onboarding done: three screens and two e-mails.')
  expect(text).toMatch(/≈ \$0\.0\d/)
  expect(text).toContain('1 open, 1 working')
})

test('next steps and the estimate share one box above the prompt: the suggestions, then what the typed message costs', async ($, on) => {
  const draft = { text: '' }
  const forkAnswers = [{ text: '[{"label": "Run the tests", "prompt": "run the tests"}, {"label": "Commit it", "prompt": "commit"}]', read: 200_000, write: 0 }]
  const clock = world(on, { usage: BIG, draft, forkAnswers })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn({ answer: 'x'.repeat(120) }))
  await clock.settle()
  const ui = await band($, 'desktop')
  draft.text = 'corrige o bug do login'
  await clock.advance(2000)
  const text = JSON.stringify(await ui.drawn())
  expect(text).toContain('✦ Next steps')
  expect(text).toContain('Run the tests')
  expect(text).toContain('"label":"dismiss"')
  expect(text).toContain('"This message "')
  // one bordered box, the suggestions first and the estimate last, nearest the prompt
  expect(text.split('"borderStyle":"round"').length).toBe(2)
  expect(text.indexOf('Run the tests')).toBeLessThan(text.indexOf('"This message "'))
})

test('the estimate learns from past turns of the same kind', async ($, on) => {
  const draft = { text: '' }
  const learned = { history: { quick: [], edit: [{ steps: 4, out: 2000, agents: 0 }, { steps: 8, out: 2000, agents: 0 }, { steps: 9, out: 4000, agents: 0 }], build: [], agents: [] }, agentUsd: [] }
  const clock = world(on, { usage: BIG, draft, store: { 'estimate.history': learned } })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const ui = await band($, 'terminal')
  draft.text = 'corrige o bug do login'
  await clock.advance(2000)
  expect(JSON.stringify(await ui.drawn())).toContain('small edit, ~8 calls (from your last 3)')
})

test('a single prompt gets a time estimate: from the turns before it, and from Claude\'s own step plan when it gives one', async ($, on) => {
  const past = Array.from({ length: 6 }, (_, i) => ({ ms: (4 + i) * MIN, steps: 6, profile: 'edit' }))
  const store: Record<string, unknown> = { 'progress.turns': past }
  const clock = world(on, { store })
  await $.session.start(start)
  await clock.settle()
  const ui = await mount($, 'terminal')
  await $.turn.start({ text: 'corrige o bug do login', turnId: 'p1' } as never)
  await clock.advance(MIN)
  let text = JSON.stringify(await ui.drawn())
  // the edits before took 4-9 minutes, median 7: about 6 left after the first
  expect(text).toContain('typical for your last 6 turns')
  expect(text).toContain('≈ 6m left')
  // Claude plans four steps and finishes one in two minutes: six more by its pace
  await $.tool.call({ tool: 'mcp__cockpit__step', total: 4, done: 0, note: 'reading' } as never)
  await clock.advance(MIN)
  await $.tool.call({ tool: 'mcp__cockpit__step', done: 1, note: 'fixing the check' } as never)
  await clock.advance(1000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Steps 1/4')
  // the turn's timer counts up beside Progress whatever fills the bar
  expect(text).toContain('⏱ 2:01 · ● fixing the check')
  expect(text).toContain('≈ 6m left')
  // the finished turn is remembered for the next estimate
  await $.turn.complete(turn({ turnId: 'p1' }))
  await clock.settle()
  await $.turn.start({ text: 'corrige outro bug', turnId: 'p2' } as never)
  await clock.advance(1000)
  expect(JSON.stringify(await ui.drawn())).toContain('typical for your last 7 turns')
})

test("See changes covers the chat's edits, the turn in flight's too, so it agrees with the Files count", async ($, on) => {
  const clock = world(on, { files: { [`${ROOT}/src/a.ts`]: 'x\n' } })
  on('tool.call', { tool: 'Edit' }, async () => ({ result: 'ok' }) as never)
  await $.session.start(start)
  await clock.settle()
  const ui = await mount($, 'terminal')
  await $.turn.start({ text: 'fix it', turnId: 'r1' } as never)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/a.ts`, old_string: 'x', new_string: 'y' } as never)
  await clock.advance(1000)
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('1 changed')
  expect(text).toContain('1 edit (steps through')
  await $.turn.complete(turn({ turnId: 'r1' }))
  await $.turn.start({ text: 'and this', turnId: 'r2' } as never)
  await clock.advance(1000)
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('1 edit (steps through')
})

test("Session and Week say what their percent is worth on the account's plan, in brackets after it", async ($, on) => {
  // Max 20x, as Claude Code saved the account: $200 a month, ~$46 a week
  const files = { '/home/t/.claude.json': JSON.stringify({ oauthAccount: { organizationRateLimitTier: 'default_claude_max_20x' } }) }
  const clock = world(on, { files })
  await $.session.start(start)
  await clock.settle()
  for (const surface of SURFACES) {
    const ui = await mount($, surface)
    await clock.settle()
    const text = JSON.stringify(await ui.drawn())
    // the week at 41%: $200 / 4.35 × 41.2% ≈ $19; the session at 5%, a session % worth 0.1 week % until learned
    expect(text).toContain('(~$19)')
    expect(text).toContain('(~$0.2)')
  }
})

test('agents, goals and the replay open on the Cockpit Board, never in panes of their own', async ($, on) => {
  const opens: unknown[] = []
  const clock = world(on, { opens })
  on('session.surface', async () => ({ value: 'desktop' }) as never)
  await $.session.start(start)
  await clock.settle()
  const run = (command: string) => $.command.run({ command, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  await run('agents-info')
  await run('goals')
  const ids = opens.map(o => (o as { id?: string }).id)
  expect(ids).toContain('cockpit')
  expect(ids.filter(id => id !== 'cockpit')).toEqual([])
})

test('the desktop board scrolls natively, cards and tree together; the terminal still moves the tree row by row', async ($, on) => {
  const clock = world(on)
  const moved: number[] = []
  // the engine beneath: moving the window is its job
  on('ui.scroll', async (_$, e) => {
    moved.push((e as { offset: number }).offset)
    return {} as never
  })
  await $.session.start(start)
  await clock.settle()
  const wheel = { component: 'Pane', requestId: 'cockpit', offset: 5, by: 1, bodyRows: 20, contentRows: 200, origin: { kind: 'person' } }
  const desk = await mount($, 'desktop')
  await clock.settle()
  await desk.drawn()
  await $.ui.scroll(wheel as never)
  expect(moved).toEqual([5])
  await desk.unmount?.()
  const term = await mount($, 'terminal')
  await clock.settle()
  await term.drawn()
  await $.ui.scroll(wheel as never)
  expect(moved).toEqual([5])
})

test("a card's icon takes the colour of its tag, not its section's", () => {
  const act = cardSvg(320, { icon: 'goals', label: 'Goals', color: '#5fbf8f', level: 'act', phrase: 'behind' }).source
  expect(act).not.toContain('#5fbf8f')
  const plain = cardSvg(320, { icon: 'goals', label: 'Goals', color: '#5fbf8f' }).source
  expect(plain).toContain('#5fbf8f')
})

test("THIS CHAT's header says what the chat has cost at API prices; the Cache line no longer does", async ($, on) => {
  const clock = world(on, { usage: { ...USAGE, cost: { usd: 2.21 } } })
  await $.session.start(start)
  await clock.settle()
  for (const surface of SURFACES) {
    const ui = await mount($, surface)
    await clock.settle()
    const text = JSON.stringify(await ui.drawn())
    expect(text).toContain('THIS CHAT · ≈ $2.21 (if API)')
    expect(text).not.toContain('chat so far')
  }
})

test('Replay stays on the board: no Replay band above the prompt after a turn with edits', async ($, on) => {
  const clock = world(on)
  on('tool.call', { tool: 'Edit' }, async () => ({ result: 'ok' }) as never)
  // with nothing of its own to draw, the board hands the band to whatever is beneath it
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/a.ts`, old_string: 'x', new_string: 'y' } as never)
  await $.turn.complete(turn())
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'cockpit', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 120, hasSurvey: false } as never })
  await clock.settle()
  expect(JSON.stringify(await band.drawn())).not.toContain('Replay')
  const ui = await mount($, 'desktop')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).toContain("1 edit (steps through")
})

for (const type of ['cockpit:crew-light', 'cockpit:savvy-light']) {
  test(`a ${type} worker counts as the crew on the board (the old savvy-* name too)`, async ($, on) => {
    const clock = world(on)
    on('tool.call', { tool: 'Agent' }, async () => ({ result: { status: 'completed', content: [] } }) as never)
    await $.session.start(start)
    await clock.settle()
    await $.tool.call({ tool: 'Agent', subagent_type: type, description: 'Rename the files', prompt: 'x' } as never)
    const ui = await mount($, 'desktop')
    await clock.settle()
    // the launch moved the crew's flow on from planning (its run is over, so 0 are running now)
    expect(JSON.stringify(await ui.drawn())).toContain('Tasks 0 running')
  })
}


// ---- the CHANGES zone: Ship, hand-offs, the wrong-folder nudge and the visual compare

test('"pode deploy" carries the ship checklist along as context', async ($, on) => {
  const clock = world(on)
  await $.session.start(start)
  await clock.settle()
  const r = (await $.prompt.submit(prompt('ok, pode deploy isso'))) as { context?: string[] }
  await clock.settle()
  expect(JSON.stringify(r.context ?? [])).toContain('Cockpit Ship: run the six-step ship checklist')
  const plain = (await $.prompt.submit(prompt('what does this function do?'))) as { context?: string[] }
  await clock.settle()
  expect(JSON.stringify(plain.context ?? [])).not.toContain('Cockpit Ship')
})

test('each sent message carries its route as a note Claude follows: a worker for mechanical work, the skill for a chart, nothing for a reply', async ($, on) => {
  const clock = world(on, { usage: BIG })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const note = async (text: string) => {
    const r = (await $.prompt.submit(prompt(text))) as { context?: string[] }
    await clock.settle()
    return JSON.stringify(r.context ?? [])
  }
  // this chat is on Fable: mechanical work goes down to a Haiku worker
  let ctx = await note('roda os testes e lista os que falham')
  expect(ctx).toContain('Cockpit route for this message: Helper · Haiku low')
  expect(ctx).toContain('the Agent tool with model \\"haiku\\"')
  ctx = await note('monta um gráfico da receita por mês')
  expect(ctx).toContain('Use dataviz.')
  ctx = await note('faz o rebase da branch em cima da main')
  expect(ctx).toContain('Plan first: reply with a short plan')
  // an approval carries nothing; an image without Codex says Claude cannot make it
  expect(await note('pode deploy')).not.toContain('Cockpit route')
  expect(await note('gera um logo pro app')).toContain('Claude cannot make raster images')
})

test('with Codex on, a decision gets a read-only second opinion from Codex and an image is made through it', async ($, on) => {
  const clock = world(on, { usage: BIG, store: { 'crew.codex': 'on' }, codexPath: '/usr/local/bin/codex' })
  await $.session.start(start)
  await clock.settle()
  await $.turn.complete(turn())
  const send = async (text: string) => JSON.stringify(((await $.prompt.submit(prompt(text))) as { context?: string[] }).context ?? [])
  let ctx = await send('decide a arquitetura do módulo de pagamentos')
  expect(ctx).toContain('Codex 2nd opinion')
  expect(ctx).toContain("'/usr/local/bin/codex' exec --sandbox read-only --ephemeral")
  expect(ctx).toContain('never the whole repository')
  // the prompt goes in on stdin through a quoted here-document: nothing in it runs in the shell
  expect(ctx).toContain("- <<'CODEX_PROMPT'")
  expect(ctx).toContain('leave out secrets, keys, tokens')
  expect(ctx).toContain('Codex is on.')
  ctx = await send('gera um logo pro app')
  expect(ctx).toContain('Make the image through Codex in a new empty temp folder')
  expect(ctx).toContain('--sandbox workspace-write')
  expect(ctx).toContain("-C <that folder> - <<'CODEX_PROMPT'")
  expect(ctx).not.toContain('dangerously')
  const ui = await band($, 'desktop')
  await clock.settle()
  expect(JSON.stringify(await ui.drawn())).toContain('Codex: on')
})

test('a pasted screenshot asks for a visual bug report and a look', async ($, on) => {
  const clock = world(on)
  await $.session.start(start)
  await clock.settle()
  const r = (await $.prompt.submit({ ...(prompt('arruma isso aí') as object), attachments: [{ type: 'image', mediaType: 'image/png' }] } as never)) as { context?: string[] }
  await clock.settle()
  expect(JSON.stringify(r.context ?? [])).toContain('visual bug report')
})

test('the ship tool moves Ship through shipping, held and live, and the CHANGES line follows', async ($, on) => {
  const clock = world(on)
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 1, state: 'running' } as never)
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 1, state: 'done', note: 'nothing new' } as never)
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 4, state: 'done', note: 'fix: streak copy' } as never)
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('shipping')
  expect(text).toContain('committed · ')
  expect(text).toContain('fix: streak copy')
  expect(text).toContain('"label":"Cancel"')
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 5, state: 'held', note: 'domain unverified' } as never)
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('held on step 5')
  expect(text).toContain('shipping, held on you')
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 6, state: 'done', url: 'https://pacto.life', preview: 'https://pacto-git-main.vercel.app' } as never)
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('live')
  expect(text).toContain('"label":"Open pacto.life ↗"')
  expect(text).toContain('"label":"▶ Ship again"')
  expect(text).toContain('all live · ')
})

test('a hand-off lands in Needs you with Open and Done, and Done resumes the chat', async ($, on) => {
  const entered: string[] = []
  const toasts: string[] = []
  const clock = world(on, { entered, toasts })
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'mcp__cockpit__ship', step: 5, state: 'running' } as never)
  await $.tool.call({ tool: 'mcp__cockpit__handoff', title: 'Verify pacto.life on Vercel', url: 'https://vercel.com/x/domains', paste: '_vercel TXT vc-domain-verify=abc', why: 'prod deploy waits on it', step: 5 } as never)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Verify pacto.life on Vercel')
  expect(text).toContain('1 waiting · resumes the moment you press Done')
  expect(text).toContain('"label":"Open vercel.com ↗"')
  expect(text).toContain('"label":"Done ✓"')
  expect(text).toContain('held on step 5')
  expect(toasts.some(t => t.includes('Needs you: Verify pacto.life on Vercel'))).toBe(true)
  await ui.press({ key: 'need:1:done' })
  await clock.settle()
  expect(entered.some(t => t.startsWith('Done: "Verify pacto.life on Vercel"'))).toBe(true)
  text = JSON.stringify(await ui.drawn())
  expect(text).not.toContain('Verify pacto.life on Vercel')
  expect(text).toContain('1 solved this chat')
})

test('three commands that cd into another folder ask to move the chat, as a Needs you item', async ($, on) => {
  const entered: string[] = []
  const clock = world(on, { entered })
  on('tool.call', { tool: 'Bash' }, async () => ({ result: { stdout: '', stderr: '', exitCode: 0 } }) as never)
  await $.session.start(start)
  await clock.settle()
  for (let i = 0; i < 3; i++) await $.tool.call({ tool: 'Bash', command: 'cd /tmp/other-project && npm test' } as never)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('Chat opened in the wrong folder?')
  expect(text).toContain('3 cd into /tmp/other-project')
  expect(text).toContain('"label":"Move chat"')
  await ui.press({ key: 'need:1:move' })
  await clock.settle()
  expect(entered.some(t => t.startsWith('Move this chat to /tmp/other-project'))).toBe(true)
  text = JSON.stringify(await ui.drawn())
  expect(text).not.toContain('wrong folder')
})

test('See visual changes opens the compare under File Changes, with the asks numbered', async ($, on) => {
  const entered: string[] = []
  const clock = world(on, { entered })
  await $.session.start(start)
  await clock.settle()
  await $.tool.call({ tool: 'mcp__cockpit__look', route: '/onboarding', viewport: '1280×800', after: '/tmp/after.png', verdict: 'differs', asks: [{ text: 'streak counter shows day 1', done: true }, { text: 'CTA gap is 16px', done: false, x: 0.5, y: 0.9 }] } as never)
  await clock.settle()
  const ui = await mount($, 'desktop')
  await clock.settle()
  let text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"label":"◫ See visual changes"')
  expect(text).not.toContain('BEFORE')
  await ui.press({ key: 'files:visual' })
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).toContain('"label":"◫ Hide visual changes"')
  expect(text).toContain('BEFORE')
  expect(text).toContain('AFTER')
  expect(text).toContain('CTA gap is 16px')
  expect(text).toContain('"label":"Fix the rest"')
  await ui.press({ key: 'compare:fix' })
  await clock.settle()
  expect(entered.some(t => t.includes('- CTA gap is 16px'))).toBe(true)
  await ui.press({ key: 'compare:ok' })
  await clock.settle()
  text = JSON.stringify(await ui.drawn())
  expect(text).not.toContain('BEFORE')
})
