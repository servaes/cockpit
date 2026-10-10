# routeNote security review (cockpit/hooks/register.tsx)

1. **Shell injection through the double-quoted image prompt** (line 5922, severity High): the slot `"<what to draw, and the file path to save it to>"` is in double quotes and Claude fills it with the person's text (which may be pasted from a web page or file), so `$(...)`, backticks or `"` in it run as shell commands, outside Codex's sandbox, in the person's session.
   Fix: tell Claude to pass the prompt on stdin through a quoted heredoc (`<<'EOF'`) or in single quotes escaped as `'\''`, never in double quotes.
2. **Image run gets write access to the whole project** (line 5922, severity High): `--sandbox workspace-write -C <project cwd>` lets a third-party CLI read and overwrite everything in the project (`.env`, keys, source) from a prompt built from the person's text, which is attacker-steerable by pasted content (a message matching the image regex is enough).
   Fix: run it with `-C` set to a fresh empty temp folder and have Claude copy the one finished image into the project.
3. **Project material goes to a third party without a per-send ask, redaction or cleanup** (lines 5895-5897 and 5926, severity Medium): once the person has switched Codex on, any message matching the think/risky keyword regex makes Claude copy the PRD, plan and diff to a temp folder and send them to OpenAI automatically, with no instruction to strip secrets (a diff can contain keys) and no step that deletes the temp folder.
   Fix: add "leave out secrets and .env content, delete the temp folder afterwards" to the text at 5895 and make the note ask the person before the first send.
4. **Empty cwd falls back to `.`** (line 5922, severity Medium): when `$.session.cwd()` fails, `cwd || '.'` hands Codex write access to whatever folder the shell happens to be in, not the project.
   Fix: return null (no Codex image step, say so) when `cwd` is empty instead of using `'.'`.
5. **Unquoted `<that folder>` placeholder** (line 5896, severity Low): the temp folder path is left for Claude to write into the command unquoted, so a path with spaces or shell characters breaks the command or injects arguments, unlike `codexBin` and `cwd`, which go through `quoteArg`.
   Fix: write `-C '<that folder>'` and say "single-quote the path" in the text.
