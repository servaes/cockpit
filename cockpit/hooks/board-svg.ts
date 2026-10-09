// The board's desktop look (visual 3.0): each block of the Cockpit Board drawn as one SVG card,
// the way the agents panel already is. The terminal keeps its text
// rows; the desktop draws proportional text, where block-glyph bars never lined up, so there the
// gauges are real shapes. Pure functions only: the hooks module passes the data in.

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

export const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

// Rough advance of system UI text, in em; good enough to size a slot.
const charEm = (ch: string): number =>
  /[\s.,:;'|!il1()[\]·]/.test(ch) ? 0.3 : /[A-ZА-ЯЁmwшщжюМШЩЖЮ@%]/.test(ch) ? 0.72 : 0.56

export const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)

/** Cuts `s` to fit `maxW` pixels, with an ellipsis when it had to cut. */
export const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

// One palette for both themes: neutrals flip with the system, tones read on either.
export const TONE: Record<string, string> = {
  blue: '#5b8def',
  green: '#3fa66b',
  amber: '#d99a26',
  yellow: '#d9a520',
  red: '#e0564f',
  violet: '#8f8cf4',
  cyan: '#2fb3c9',
  teal: '#26a69a',
  orange: '#f0803c',
  magenta: '#c160c9',
  gray: '#8d8b86',
}

/** A colour the terminal names (`cyan`, `green`) or a hex, as a hex the SVG can fill with. */
export const hexOf = (c: string | undefined, fallback = TONE.gray): string => (!c ? fallback : c.startsWith('#') ? c : (TONE[c] ?? fallback))

const CSS = `<style>
.ink{fill:#1f1e1d}.sub{fill:#6b6a66}.mute{fill:#9a9893}.track{fill:#ebe9e4}.card{fill:#f7f6f3;stroke:#e7e5e0}.hair{stroke:#e7e5e0}.tick{fill:#d3d0c9}.pace{fill:#1f1e1d}.rule{fill:#c9c6bf}
@media (prefers-color-scheme: dark){.ink{fill:#ecebe8}.sub{fill:#aaa8a2}.mute{fill:#76746f}.track{fill:#33322f}.card{fill:#222221;stroke:#30302e}.hair{stroke:#30302e}.tick{fill:#4a4946}.pace{fill:#ecebe8}.rule{fill:#4a4946}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.25}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${body}</svg>`

const text = (x: number, y: number, s: string, size: number, cls: string, extra = ''): string =>
  `<text class="${cls}" x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${extra}>${xml(s)}</text>`

const tinted = (x: number, y: number, s: string, size: number, color: string, extra = ''): string =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${color}"${extra}>${xml(s)}</text>`

const NUM = ' font-variant-numeric="tabular-nums"'
const BOLD = ' font-weight="600"'

/** A rounded pill with a word in it; returns the markup and its width. */
const pill = (x: number, y: number, word: string, color: string): [string, number] => {
  const w = Math.round(textWidth(word, 10.5) + 14)
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="17" rx="8.5" fill="${color}" fill-opacity=".15"/>${tinted(x + w / 2, y + 12, word, 10.5, color, `${BOLD} text-anchor="middle"`)}`,
    w,
  ]
}

/** A bar: the track, the fill, optional ticks (in percent) and a pace marker (in percent). */
const bar = (x: number, y: number, w: number, h: number, pct: number, color: string, ticks: number[] = [], marker?: number): string => {
  const p = Math.max(0, Math.min(100, pct))
  const fill = p > 0 ? Math.max(h, Math.round((w * p) / 100)) : 0
  const tk = ticks.map(t => `<rect class="tick" x="${x + Math.round((w * t) / 100) - 0.5}" y="${y}" width="1" height="${h}"/>`).join('')
  const mk =
    marker === undefined
      ? ''
      : (() => {
          const mx = x + Math.round((w * Math.max(0, Math.min(100, marker))) / 100)
          return `<rect class="pace" x="${mx - 1}" y="${y - 3}" width="2" height="${h + 6}" rx="1"/>`
        })()
  return `<rect class="track" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>${tk}${fill ? `<rect x="${x}" y="${y}" width="${fill}" height="${h}" rx="${h / 2}" fill="${color}"/>` : ''}${mk}`
}

// Section icons drawn as shapes, 12 px, centred on (x, y): glyphs from the font came out at odd
// sizes, and some (⚡) as colour emoji.
const ICONS: Record<string, (x: number, y: number, c: string) => string> = {
  session: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M${x} ${y - 3}v3l2 1.5" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  week: (x, y, c) => `<rect x="${x - 5.5}" y="${y - 4.5}" width="11" height="10" rx="2" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M${x - 5.5} ${y - 1.5}h11M${x - 2.5} ${y - 6.5}v3M${x + 2.5} ${y - 6.5}v3" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`,
  context: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M${x} ${y}V${y - 5.5}A5.5 5.5 0 0 1 ${x + 5.5} ${y}z" fill="${c}"/>`,
  cache: (x, y, c) => `<path d="M${x + 1} ${y - 6}L${x - 4} ${y + 1}h4l-1 5 5-7h-4z" fill="${c}"/>`,
  progress: (x, y, c) => `<path d="M${x} ${y - 5.5}l5.5 5.5-5.5 5.5-5.5-5.5z" fill="${c}"/>`,
  goals: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`,
  agents: (x, y, c) => `<circle cx="${x - 3}" cy="${y - 2.5}" r="2.2" fill="${c}"/><circle cx="${x + 3}" cy="${y - 2.5}" r="2.2" fill="${c}" fill-opacity=".6"/><path d="M${x - 6.5} ${y + 5.5}a3.5 3 0 0 1 7 0zM${x - 0.5} ${y + 5.5}a3.5 3 0 0 1 7 0z" fill="${c}"/>`,
  caution: (x, y, c) => `<path d="M${x} ${y - 5.5}l6 10.5h-12z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x} ${y - 1.5}v3" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/><circle cx="${x}" cy="${y + 3.4}" r=".8" fill="${c}"/>`,
  ship: (x, y, c) => `<path d="M${x} ${y + 2}V${y - 6}M${x - 3.5} ${y - 2.5}l3.5 -3.5 3.5 3.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x - 6} ${y + 2.5}v3.5h12v-3.5" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`,
  files: (x, y, c) => `<path d="M${x - 4} ${y - 6}h5l3 3v9h-8z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x - 2} ${y + 0.5}h4M${x - 2} ${y + 3}h4" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>`,
}

export type Mark = 'done' | 'running' | 'planned' | 'failed' | 'held' | 'dot' | 'none'

/** The status mark at the start of a list row. */
const mark = (x: number, y: number, m: Mark, color: string): string => {
  if (m === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (m === 'done') return `<circle cx="${x}" cy="${y}" r="6" fill="${color}" fill-opacity=".16"/><path d="M${x - 3} ${y}l2 2 4-4.2" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  if (m === 'failed') return `<path d="M${x - 3.2} ${y - 3.2}l6.4 6.4M${x + 3.2} ${y - 3.2}l-6.4 6.4" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`
  if (m === 'held') return `<path d="M${x} ${y - 5}l5 9h-10z" fill="${color}" fill-opacity=".2" stroke="${color}" stroke-width="1.2" stroke-linejoin="round"/>`
  if (m === 'dot') return `<circle cx="${x}" cy="${y}" r="2" fill="${color}"/>`
  if (m === 'planned') return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${color}" stroke-opacity=".7" stroke-width="1.3" stroke-dasharray="2 2"/>`
  return ''
}

// --- the one status scale every meter on the board speaks: the same three words, the same colours

export type Level = 'fine' | 'watch' | 'act' | 'none'
export const LEVEL: Record<Level, { word: string; color: string }> = {
  fine: { word: 'fine', color: TONE.green },
  watch: { word: 'watch', color: TONE.amber },
  act: { word: 'act now', color: TONE.red },
  none: { word: '—', color: TONE.gray },
}

// --- a zone's heading: ACCOUNT on top, THIS CHAT under a rule that sets the chat apart

/** A button's legend in the board's small type: the price first, what the button does in brackets after it. */
export function legendSvg(W: number, s: string, size = 10.5): { source: string; height: number } {
  const H = 16
  return { source: svg(W, H, text(0, 11.5, fitText(s, size, W), size, 'sub', NUM)), height: H }
}

export function dividerSvg(W: number, label: string, after = '', rule = false): { source: string; height: number } {
  const top = rule ? 18 : 0
  const lw = textWidth(label, 11) * 1.12 + label.length * 1.1
  const rest = after ? fitText(after, 11, W - lw - 16) : ''
  const body = `${rule ? `<rect class="rule" x="0" y="4" width="${W}" height="1.5" rx=".75"/>` : ''}
${text(0, top + 14, label, 11, 'ink', `${BOLD} letter-spacing=".1em"`)}
${rest ? text(lw + 8, top + 14, rest, 11, 'sub', NUM) : ''}`
  return { source: svg(W, top + 24, body), height: top + 24 }
}

// --- a section: one heading row (icon, title, status pill, its phrase, the value), a thin bar,
// at most a line of detail, then list rows. No frame: air and a hairline set sections apart.

export type CardRow = {
  mark: Mark
  color?: string
  text: string
  strong?: boolean
  dim?: boolean
  tail?: string
  add?: number
  del?: number
}

export type CardSpec = {
  icon: string
  label: string
  color: string
  /** The icon's own colour when it is not the section's. */
  iconColor?: string
  /** The status pill: a Level speaks the board's one scale; `state` a word of the section's own. */
  level?: Level
  state?: string
  stateColor?: string
  /** What the status means, beside the pill. */
  phrase?: string
  value?: string
  /** Plain small text right of the value, in brackets (what the percent is worth). */
  valueNote?: string
  bar?: { pct: number; color: string; ticks?: number[]; marker?: number }
  /** Small text right of the bar (a reset time). */
  aside?: string
  lines?: { text: string; color?: string; strong?: boolean }[]
  rows?: CardRow[]
  more?: string
  /** No hairline under it: the buttons that belong to it follow. */
  open?: boolean
}

const IND = 20
const HEAD_H = 22
const ROW_H = 19
const LINE_H = 15
const SEP = 9

export function cardHeight(c: CardSpec): number {
  let y = HEAD_H
  if (c.bar) y += 10
  y += (c.lines?.length ?? 0) * LINE_H
  if (c.rows?.length) y += 3 + c.rows.length * ROW_H
  if (c.more) y += LINE_H
  return y + SEP
}

export function cardSvg(W: number, c: CardSpec): { source: string; height: number } {
  const height = cardHeight(c)
  const color = hexOf(c.color)
  const out: string[] = []
  out.push(text(IND, 15, c.label, 12.5, 'ink', BOLD))
  let x = IND + textWidth(c.label, 12.5) + 8
  const noteW = c.value && c.valueNote ? textWidth(c.valueNote, 11) + 14 : 0
  const valueW = c.value ? textWidth(c.value, 12) + 8 + noteW : 0
  const level = c.level ? LEVEL[c.level] : null
  const word = level ? level.word : c.state
  // The icon takes its tag's colour, so the whole heading says the state; a section with no tag keeps its own.
  const iconHex = hexOf(c.iconColor ?? (level ? level.color : c.state ? (c.stateColor ? hexOf(c.stateColor) : TONE.gray) : c.color))
  out.push(ICONS[c.icon] ? ICONS[c.icon](7, 11, iconHex) : tinted(7, 15, c.icon, 11, iconHex, ' text-anchor="middle"'))
  if (word) {
    const sc = level ? level.color : c.stateColor ? hexOf(c.stateColor) : TONE.gray
    const [p, pw] = pill(x, 3, fitText(word, 10.5, Math.max(20, W - valueW - x - 30)), sc)
    out.push(p)
    x += pw + 6
  }
  if (c.phrase) {
    const room = W - valueW - x - 6
    if (room > 24) out.push(text(x, 15, fitText(c.phrase, 11, room), 11, 'sub'))
  }
  if (c.value) out.push(text(W - noteW, 15, c.value, 12, 'ink', `${BOLD}${NUM} text-anchor="end"`))
  if (noteW) out.push(text(W, 15, c.valueNote as string, 11, 'sub', `${NUM} text-anchor="end"`))
  let y = HEAD_H
  if (c.bar) {
    // The aside takes what it needs, up to 60% of the row; the bar keeps the rest.
    const aside = c.aside ? fitText(c.aside, 10.5, (W - IND) * 0.6) : ''
    const asideW = aside ? textWidth(aside, 10.5) + 10 : 0
    out.push(bar(IND, y + 1, W - IND - asideW, 4, c.bar.pct, hexOf(c.bar.color), c.bar.ticks, c.bar.marker))
    if (aside) out.push(text(W, y + 6.5, aside, 10.5, 'mute', `${NUM} text-anchor="end"`))
    y += 10
  }
  for (const l of c.lines ?? []) {
    y += LINE_H
    const s = fitText(l.text, 11, W - IND)
    out.push(l.color ? tinted(IND, y - 3, s, 11, hexOf(l.color), l.strong ? BOLD : '') : text(IND, y - 3, s, 11, 'sub', l.strong ? BOLD : ''))
  }
  if (c.rows?.length) {
    y += 3
    for (const r of c.rows) {
      const cy = y + ROW_H / 2
      out.push(mark(IND + 5, cy, r.mark, hexOf(r.color, color)))
      // The tail (or the line counts) takes what it needs, up to half the row; the text the rest.
      const counts = r.add !== undefined || r.del !== undefined ? `+${r.add ?? 0} −${r.del ?? 0}` : ''
      const tailText = counts || r.tail || ''
      const avail = W - IND - 16
      const tailW = tailText ? Math.min(avail * 0.5, textWidth(tailText, 10.5)) : 0
      const label = fitText(r.text, 12, avail - tailW - (tailW ? 10 : 0))
      out.push(text(IND + 16, cy + 4, label, 12, r.dim ? 'mute' : 'ink', r.strong ? ' font-weight="500"' : ''))
      if (counts) {
        const del = `−${r.del ?? 0}`
        out.push(tinted(W, cy + 4, del, 10.5, TONE.red, `${NUM} text-anchor="end"`))
        out.push(tinted(W - textWidth(del, 10.5) - 6, cy + 4, `+${r.add ?? 0}`, 10.5, TONE.green, `${NUM} text-anchor="end"`))
      } else if (tailText) {
        out.push(text(W, cy + 4, fitText(tailText, 10.5, tailW), 10.5, 'mute', `${NUM} text-anchor="end"`))
      }
      y += ROW_H
    }
  }
  if (c.more) {
    y += LINE_H
    out.push(text(IND + 16, y - 3, c.more, 11, 'mute'))
  }
  if (!c.open) out.push(`<line class="hair" x1="${IND}" y1="${height - 0.5}" x2="${W}" y2="${height - 0.5}"/>`)
  return { source: svg(W, height, out.join('')), height }
}

// --- the visual compare: the screen before (what the person pasted) and after (the newest
// screenshot), side by side, with a numbered pin per ask, then the asks as numbered rows

export type CompareAsk = { text: string; done: boolean; x?: number; y?: number }
export type CompareSide = { label: string; sub: string; data?: string }

export function compareSvg(W: number, before: CompareSide, after: CompareSide, asks: CompareAsk[]): { source: string; height: number } {
  const gap = 10
  const fw = Math.max(80, Math.floor((W - IND - gap) / 2))
  const fh = Math.round(fw * 0.62)
  const top = 18
  const rowsY = top + fh + 10
  const height = rowsY + asks.length * ROW_H + SEP
  const out: string[] = []
  const side = (s: CompareSide, x: number, pins: 'before' | 'after') => {
    out.push(tinted(x, 12, s.label, 10, pins === 'after' ? TONE.green : TONE.gray, `${BOLD} letter-spacing=".08em"`))
    out.push(text(x + textWidth(s.label, 10) * 1.2 + 6, 12, s.sub, 10, 'mute', NUM))
    out.push(`<clipPath id="cp-${pins}"><rect x="${x}" y="${top}" width="${fw}" height="${fh}" rx="6"/></clipPath>`)
    out.push(`<rect class="track" x="${x}" y="${top}" width="${fw}" height="${fh}" rx="6"/>`)
    if (s.data) out.push(`<image href="data:image/png;base64,${s.data}" x="${x}" y="${top}" width="${fw}" height="${fh}" preserveAspectRatio="xMidYMin slice" clip-path="url(#cp-${pins})"/>`)
    else {
      out.push(`<rect x="${x + 0.5}" y="${top + 0.5}" width="${fw - 1}" height="${fh - 1}" rx="6" fill="none" class="hair" stroke-dasharray="3 3"/>`)
      out.push(text(x + fw / 2, top + fh / 2 + 3, pins === 'before' ? 'the screenshot you pasted (in the chat)' : 'no screenshot yet', 10, 'mute', ' text-anchor="middle"'))
    }
    asks.forEach((a, i) => {
      // pins sit where the ask is on the screen; with no image to sit on, they stack along the edge
      const px = s.data && a.x !== undefined ? x + 4 + Math.round(a.x * (fw - 8)) : x + fw - 12
      const py = s.data && a.y !== undefined ? top + 4 + Math.round(a.y * (fh - 8)) : top + 12 + i * 16
      const c = pins === 'after' && a.done ? TONE.green : TONE.amber
      out.push(`<circle cx="${px}" cy="${py}" r="7" fill="${c}"/>${tinted(px, py + 3.2, String(i + 1), 9, '#1a1210', `${BOLD} text-anchor="middle"`)}`)
    })
  }
  side(before, IND, 'before')
  side(after, IND + fw + gap, 'after')
  asks.forEach((a, i) => {
    const cy = rowsY + i * ROW_H + ROW_H / 2
    const c = a.done ? TONE.green : TONE.amber
    out.push(`<circle cx="${IND + 6}" cy="${cy}" r="7" fill="${c}"/>${tinted(IND + 6, cy + 3.2, String(i + 1), 9, '#1a1210', `${BOLD} text-anchor="middle"`)}`)
    const tail = a.done ? 'done' : 'open'
    out.push(text(IND + 20, cy + 4, fitText(a.text, 12, W - IND - 20 - textWidth(tail, 10.5) - 10), 12, 'ink', a.done ? '' : ' font-weight="500"'))
    out.push(tinted(W, cy + 4, tail, 10.5, a.done ? TONE.gray : TONE.amber, `${NUM} text-anchor="end"`))
  })
  return { source: svg(W, height, out.join('')), height }
}
