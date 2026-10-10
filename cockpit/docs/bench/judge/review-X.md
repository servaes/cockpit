# routeNote security review — cockpit/hooks/register.tsx

`routeNote` (lines 5903–5932) builds the "Cockpit route" context note that `crewPromptSubmit` (5935–5942) attaches to every composer message, and `CREW_SECTION` (5877–5888) tells Claude to follow that note. The values it interpolates are constants, `crew.codexBin` (from the PATH lookup at 6059–6063) and `cwd` (from `$.session.cwd()` at 5940). Findings, most serious first:

1. **Image route hands the whole project tree to Codex with write access** — line 5922. The note tells Claude to run `codex exec --sandbox workspace-write --ephemeral -C <session cwd> "..."`, so Codex reads (and may write) everything under the working tree, `.env`, keys and `.git` included; the second-opinion path (5895) deliberately isolates "only the material it needs" in a temp folder, this one does not.
   Fix: point `-C` at a fresh temp folder holding only the brief (as `codexSecondOpinion` does), have Codex save the image there, and let Claude copy the file into the project afterwards.

2. **Shell-injection template: the Codex prompt is an inline double-quoted argument** — line 5922 (`"<what to draw, and the file path to save it to>"`). Claude fills that placeholder from the user's words or from file text it quotes, and inside `"…"` the shell expands `$VAR`, `$(…)`, backticks and `\`; a description containing them runs as shell. The second-opinion string at 5897 uses the same form (fixed text today, so lower risk, but the pattern invites copying).
   Fix: instruct Claude to pass the prompt on stdin or from a file (`printf '%s' … | codex exec …`, as the crew skill now does), never as a quoted argument; apply the same to 5897.

3. **`cwd` enters the model's context unsanitised** — lines 5922 and 5940. `quoteArg` makes the path safe for `sh`, but nothing checks it for control characters, ANSI escapes, Unicode tag characters or newlines before it is written into a note Claude is told to obey; a folder Claude `cd`'d into (a repo-created directory name, say) can carry text that reads as extra instructions. The file already has `cleanText` (5444) for exactly this and does not use it here.
   Fix: run `cwd` through `cleanText`/the `TAG_CHARACTERS` and control-character checks and drop the `-C` clause (say "in the project folder") when it does not come back unchanged.

4. **"Codex is on." is attached to every message, widening when context may be sent to Codex** — lines 5930–5931. When `codexOn()` the early `return null` is skipped and even a plain "Here" message carries the note, and `CREW_SECTION` (5885–5886) reads that as licence to re-run any failing step through Codex. So a tool error in any turn can push that step's material to an external model without the person asking for it on that message.
   Fix: `if (say.length === 0) return null` unconditionally, and mention Codex only in notes that actually route to it (image, think, risky).

5. **The Codex binary is trusted from a bare PATH lookup** — line 5922 uses `crew.codexBin`, found at 6060–6062 by `command -v codex` and accepted if it matches `/^\/.*\/codex$/`. Any `codex` earlier on the engine's PATH (a project-local bin dir, a stray `~/.local/bin` drop) becomes the program the note tells Claude to run with `workspace-write` over the project.
   Fix: accept only the ChatGPT app path or a binary under a system/user bin dir outside the session cwd (reject anything inside the project), and show the resolved path in the crew row so the person can see which one is in use.
