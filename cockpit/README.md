# cockpit

A personal Claude Code mod: one side panel, titled "Cockpit Board", and one plugin.
Everything the board shows ships inside it: the file tree, the crew skill with
its worker agents and progress band, the goal meter, Replay Theater, the Caution
guard (inside Needs you), Ship and cache-tax. No other mod is needed.

## Install

In Claude Code:

```
/plugin marketplace add servaes/cockpit
/plugin install cockpit@my-mods
```

## What the board shows

On the desktop (since 3.0; compact since 3.1) the board is drawn, not typed: two zones, ACCOUNT
(Session and Week, one thin row each) and THIS CHAT under a rule. Each section is one heading row
(icon, title, a status pill, what it means, the value), a thin bar and at most one line of detail;
no boxes. Session, Week, Context and Cache speak one scale, the same words and colours everywhere:
`fine` (green), `watch` (amber), `act now` (red), and the bar takes that colour. The usage bars carry
a pace marker (how much of the window has gone by) and the time to reset. Each cache button has its
price first in its own legend (`≈ $0.02/ping · …`, `≈ $0.07 · …`). The terminal draws the same
blocks as text rows.

**The account's windows** (no header; the rows say it), from `$.session.usage()`:

- **Session** — the 5-hour window: a word (fine, high, near cap), the bar, the percent,
  when it resets and how long that is (`resets Fri 1:30 AM (in 2h40m)`), then one
  short "so what" line (`40% of the session gone, 5% used · room to spare`).
- **Week** — the 7-day window, the same way (`in 1d2h`).

After each percent, in brackets and not bold, what it is worth on your plan: the plan's price a
month over 4.35 weeks (`60% (~$28)` on Max 20x). The plan comes from the tier Claude Code saved
in `~/.claude.json`, or from the `plan` setting. A session percent counts as the share of the week
it takes, learned from the readings (about 0.1 week % per session % until it has seen 5 points).

Every section's icon takes the colour of its tag (green fine, amber watch, red act now), so the
heading row says the state at a glance.

**THIS CHAT · 45.0M tokens ≈ $2.21 (if API)** (the heading carries the tokens this chat's
requests have used, its agents' included, and their price at API rates; on a subscription that is a
yardstick, not a bill) — everything about the conversation you are
in, each part separated by a thin line. Each section carries an icon and a colour
(◔ Context, ⚡ Cache, ◆ Progress, ◎ Goals, ⚙ Agents, ⚠ Needs you, ▤ Files, ⇡ Ship):

1. **Context** — how full the context window is, with token-weather's forecast words
   and a one-line "so what" under it (also when there is no reading yet). After the tokens
   (`200k / 1.0M`) comes what messages cost at API list prices: `Last msg: $X` (the last
   turn's calls summed: cache reads, cache writes and output) and `Next ≈ $Y` (the context
   read from the cache plus ~1k tokens out). Once the cache has gone cold (an hour since the
   last call) it reads `⚠ Next ≈ $Z`, the whole context written again at the cache-write rate.
   The prices come live from Anthropic's pricing page
   (`platform.claude.com/docs/en/about-claude/pricing.md`), read at session start and once a
   day; the `CACHE_PRICES` table in `register.tsx` is the fallback when it cannot be reached.
2. **Cache** — the prompt cache, from cache-tax. A reply leaves the whole chat in a
   one-hour cache, so the next turn reads it for pennies; after an idle hour the next
   send re-writes it all at the cache-write rate. The row shows `warm` with the hour
   draining (a short bar and the minutes left) or `COLD` with how long. The lines under
   it have the tokens in the cache, what a cold re-read would cost and what a warm
   turn costs. Then one button per row, each with its legend to
   the right (the legends carry the keepwarm and handoff state; there is no separate
   state line):
   - **♨ Keep warm 6h / ■ Stop warming** — a tool-less ping every 50 idle minutes keeps
     the cache read instead of re-written, for six hours (`/keepwarm 90m` for a window
     of your own, `/keepwarm always`, `/keepwarm off`). Pings cost tokens: about one
     cache read each, 80 of them for one cold re-write on Fable.
   - **✎ Handoff now** — one fork over the chat writes the note a new chat can start
     from (goal, state, decisions, files, next steps, open questions), saves it under
     `~/.claude/mods-data/cockpit/handoff/<session>.md` and copies it. It also writes
     itself 49 minutes after the last reply on a chat over 50k tokens, while the cache
     is still warm, so it costs a read, not a re-write, and the hour starts over
     (`/handoff auto off` to stop that).
   - **`/handoff`** prints the note in the chat as markdown and copies it, to paste as a
     new chat's first message. When the saved note still covers the last reply (the
     automatic one, say), it shows that one without a new fork, so it costs nothing.

   The guard: a plain message typed into a chat over 50k tokens whose cache went cold
   is dropped once with its price; send it again to pay it, and keepwarm then holds the
   cache for three hours. `/cache-tax guard warn` only shows the price; `/cache-tax`
   prints the card (state, size, prices, keepwarm, handoff, break-even, cold writes paid).
   On a subscription the dollars are API-equivalent yardsticks, not a bill: a cold
   re-write eats a bite of the 5-hour and weekly limits.
3. **Goals** — this chat's `/goal` plan: progress bar, tasks done, elapsed or finished
   time. With no goal running, a box to type what done looks like and a **Create goal**
   button, which sends `/goal <text>` as typing it would.
4. **Progress** — fills by itself. A `/cockpit:crew` run shows as its band and
   plan (phase, bar, percent, title, crew, one row per planned task with tier and
   model). Otherwise Claude's own task list, which it writes as it works (the
   TaskCreate/TaskUpdate and TodoWrite tools), shows as tasks done out of total with
   one row each and a time estimate (`≈ 4m left`: the time per finished task so far,
   times the tasks left). Otherwise this chat's `/goal`. Otherwise, while Claude
   works with no plan, a ticking timer where the state word goes (no bar: a moving
   one only distracts), then `working`, the steps and tool calls so far and the tool
   running now (`Bash · claude plugin test`); idle
   says how long the last turn took. The board also adds one line to the system
   prompt asking Claude to keep a task list on work longer than a couple of minutes,
   so the bar and the estimate fill more often. On a large task it also asks Claude to offer
   `/cockpit:crew` in one line and wait for your choice; it never starts it on its own.
5. **Agents** — this chat's helper agents (running, done, cost, tokens, time, then
   up to six rows). `/agents-info` brings up the board; there is no separate agents panel.
6. **Needs you** — everything that waits on you, in one place, whatever the kind. A shell
   command that could wipe files or history (a recursive or forced delete, a hard git reset,
   git clean, a force push, a migration) is measured with read-only helpers (find, du, git) and
   held here with Proceed / Cancel until you answer, for up to ten minutes, exactly as the
   Caution guard always did. A small `rm` where losing it costs nothing runs without a hold
   and is listed as let through: nothing to delete, or at most 50 files and 10 MB inside the
   project or a temp folder. In bypass permissions mode the bar is 1,000 files and 500 MB,
   anywhere. A top folder (`/`, the home folder or one just under it) is always held. A hand-off Claude files with `mcp__cockpit__handoff` (an API key to
   paste, a store form, a DNS record, a login, a payment) shows as a row with the value to paste
   under it and two buttons: **Open <site> ↗** (opens the page and puts the value on your
   clipboard) and **Done ✓** (tells Claude, and resumes a held Ship). The wrong-folder nudge is a
   row here too: after three shell commands that `cd` into another project, **Move chat** moves
   the chat there once and **Not now** keeps it quiet for the session. With nothing waiting the
   section is one line: `nothing waiting · N solved this chat`.

**CHANGES** (a third zone, under a rule; its heading says where things stand: `3 files · not live
yet`, `shipping, held on you`, `live 18:42`) — what the chat produced:

7. **File Changes** — how many files Claude changed this chat, then the files themselves (up to
   six, with `+added −deleted` lines when the folder is a git repo), then two buttons on one row:
   **▶ See code changes** (Replay Theater's step-through of this chat's edits, one at a time, in the
   board) and **◫ See visual changes** (the screen before and after: the screenshot you pasted and
   the newest one Claude took, side by side with a numbered pin per ask, then the asks as rows,
   done or open; **Fix the rest** sends the open ones back to Claude, **Looks good ✓** closes it).
   A pasted screenshot tells Claude to treat it as a visual bug report and to report the new
   screenshot with `mcp__cockpit__look`.
8. **Ship** — six fixed steps to live: origin up to date, build passed, copy check (typos, AI
   slop, the English default), commit + push, deploy to prod (Vercel or Railway from the repo's
   files, push only otherwise), live check + screenshot. **▶ Ship it** (or `/ship`, or saying
   "pode deploy", "ship it") hands Claude the checklist as context; Claude reports each step with
   `mcp__cockpit__ship` and the row shows the step bar, the elapsed time and the six rows. A step
   that needs you (a domain to verify, a key) turns the pill to `act now`, the hand-off lands in
   Needs you, and Done resumes. Once live: the URL, **Open <host> ↗** (copies the link too) and
   **▶ Ship again**. The last deploy per folder is remembered (`last live 2h ago`).

Then the tree: its header buttons say what they do (↑ up, ⌂ home, ↻ refresh, ○ hidden, Σ sizes,
⊟ fold, ⊘ unselect, × clear), and below them git status, lines changed, shimmer on the files
Claude reads and writes, search, sizes, double-click to open.

Only the guard runs anything, and only the command you approve. The cache block makes
model calls: one fork per keepwarm ping and one per handoff note, nothing else. The
board adds three short sections to the system prompt (`cockpit:progress`, the task-list
request; `cockpit:ship`, how to report a ship, file a hand-off and report a look;
`cockpit:crew`, how to read a route note); nothing else of the prompt is touched. A message
you send that calls for more than plain work here carries one short route note as context
(`Cockpit route for this message: Helper · Haiku low ... Delegate this to one subagent`),
from the same rule that lights the crew row; a reply like "ok" or "pode deploy" carries none.
With the crew row's Codex switch on, a decision or a hard-to-undo step asks Claude for a
read-only second opinion from Codex (`codex exec --sandbox read-only --ephemeral`, on a temp
folder holding only the material it needs), and an image is made through Codex; Codex is
found on PATH or inside the ChatGPT app. The Ship buttons, Done, Move chat and Fix the rest send a short message as you;
nothing else is sent on its own. Note that the
guard reads every line of a Bash call, the commands inside `$( )` and backquotes too; the
body of a literal here-document (`<<'EOF'`) is the command's input and is skipped, while
an expanding one (`<<EOF`) is read, since a `$( )` in it runs.

## What else is inside

- **Commands:** `/cockpit`, `/board` and `/filetree` open the board (`/cockpit <path>`
  pins another folder); `/agents-info` brings up the board; `/goal <what done
  looks like>` starts a goal and `/goals` brings up the board and lists every chat's; `/replay` steps through
  the last turn's edits; `/ship` starts the ship checklist (`/ship cancel` resets it); `/keepwarm`,
  `/cache-tax` and `/handoff` drive the cache block.
- **Skill and agents:** `/cockpit:crew <task>` runs a big task with a crew: Claude plans it, hands each
  piece to one of five worker agents (from crew-fable for the hardest to crew-light for the
  simplest) and checks their work before it is done (this was savvy-flow). The workers are listed by the Agent tool as `cockpit:crew-fable`,
  `cockpit:crew-heavy`, `cockpit:crew-careful`, `cockpit:crew-medium` and
  `cockpit:crew-light`.
- **Tools for Claude:** `mcp__cockpit__progress` and `mcp__cockpit__step` (the
  crew's progress), `mcp__cockpit__tasks` (the goal meter's plan), `mcp__cockpit__ship` (a ship
  step), `mcp__cockpit__handoff` (something only you can do), `mcp__cockpit__look` (a screenshot
  taken to check a visual change).
- **Scrolling:** on the desktop the whole board scrolls natively, cards and tree together (the tree
  is drawn whole, up to 400 rows); the terminal keeps moving the tree row by row under the cards.
- **Everything in one pane:** agents, goals and Replay draw inside the Cockpit Board; nothing opens a pane of its own.
- **Next steps** (from Thariq Shihipar's next-steps, MIT): after a turn, up to three likely next
  prompts above the input (`next:`, press 1, 2 or 3 to put one in the prompt box as a draft, 0 to
  dismiss; the first is also the Tab ghost text). Settings: `minAnswerChars`, `suggestSkills`.
  The separate `next-steps@claude-community` plugin is disabled on purpose (it would draw twice).
- **The crew row, always above the prompt** (`⚑ Crew`, typed or not): Here, Helper, New chat,
  Crew and Plan, plus the Codex switch. While you type, the route the draft calls for is lit and
  a line says the lane and why: the kind of work (hard-to-undo, architecture, image, video,
  chart, document, UI design, research, mechanical, build, fix, quick) sets the model and effort
  it deserves and the specialist to use, then the place (`→ Plan · Opus high · Codex 2nd
  opinion (hard to undo: plan first, then run)`, `→ Here · Sonnet medium · dataviz (a chart)`).
  A rebase always plans first; a decision in a chat below Opus points to a new chat on Opus
  rather than switching here and losing the cache; mechanical work and research go to a worker,
  but only from a chat dearer than the worker; a long new build in a chat on Opus or Fable past
  80k tokens goes to a new chat; Crew lights only when you ask for the crew, agents or parallel
  work, or list a build in three or more parts. The words come from real prompts in Portuguese
  and English. The rules and the benchmark behind them (five tasks, three ways, measured cost
  and a blind judge) are in [docs/crew-2.0-prd.md](docs/crew-2.0-prd.md). A button only rewrites the
  draft (Helper puts a delegate-to-one-cheap-subagent ask before it, Crew puts `/cockpit:crew`,
  Plan the plan-first ask, Here takes any of those off) or, for New chat, writes this chat's
  handoff note (the fresh one when there is one, else one fork over the warm cache) and opens
  the app's new-chat link on the draft, naming the project folder and the note to read first:
  you click Trust workspace in the app and press Enter there; the new chat moves itself to the
  project folder. Nothing is sent. At most ten crew
  chats at a time.
- **Crew chats**, a card under Agents: every chat New chat opened, followed through the
  transcript the app writes for it (found by a marker in its first message): waiting for your
  Enter, working or finished, its model, an estimated cost and its last words. Finished chats
  stay until you press Forget finished chats; they stay in the app's sidebar either way. The Codex switch (off by default, stored under `crew.codex`)
  only turns on where a `codex` command is installed; otherwise it says so.
- **Above the prompt, while you type**, in the same box under the crew row and the next steps: what the message will cost if sent, at API list prices:
  `✎ this message ≈ $0.15–$0.60 if API · small edit (~6 calls, first guess) · ~180 tokens typed`.
  The floor is certain (the context read from the cache, or written again with a `⚠` when the
  cache is cold, plus what was typed); the rest is the work the text asks for, read as a profile
  (quick answer, small edit, build, with agents) and shaped by your own past turns of that kind
  once there are three (median to 90th percentile; stored under `estimate.history`).
  Crew and goal progress still show only on the board.
- **Settings** (in `/config`): `plan` for the dollar figure beside Session and Week (auto, Pro,
  Max 5x, Max 20x, none); `language` for the board's crew texts (auto, en, ru);
  `activity`, `glyphs`, `follow` and `column` for the tree, as filetree had them.

Each part came from a published mod; see `THIRD_PARTY_LICENSES.md`.

## Working on it

- Lives in `~/.claude/my-mods/cockpit/`, installed from the local marketplace
  `my-mods` (`~/.claude/my-mods/`). Claude Code loads a copy taken at install, so
  after an edit bump the version in `plugin.json` and `marketplace.json`, then run
  `claude plugin marketplace update my-mods` and `claude plugin update cockpit@my-mods`.
- One hooks module: the engine loads one per plugin and follows `$` only into
  functions declared at the top of that module, so every hook and helper that takes
  `$` is in `hooks/register.tsx`, each event hooked once. Pure helpers sit beside it.
- The separate `filetree`, `savvy-progress`, `savvy-flow`, `goal-meter`,
  `replay-theater` and `cache-tax` plugins must stay uninstalled or disabled while
  cockpit is on, or commands, tools, panes and the cold-send guard run twice. Do not
  install `blast-radius` alongside either.
- Turn off: `claude plugin disable cockpit@my-mods`.
- Check: `claude plugin validate ~/.claude/my-mods/cockpit`;
  tests: `claude plugin test ~/.claude/my-mods/cockpit`.
