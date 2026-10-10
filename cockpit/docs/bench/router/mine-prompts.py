"""Pull the person's own typed prompts out of the local Claude Code transcripts (first 240 chars each),
drop tool results, system text and pastes, and write them to prompts.txt for keyword mining."""
import json, os, sys, glob, re

root = os.path.expanduser('~/.claude/projects')
out = []
seen = set()
for path in glob.glob(os.path.join(root, '*', '*.jsonl')):
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            for line in f:
                try:
                    e = json.loads(line)
                except Exception:
                    continue
                if e.get('type') != 'user':
                    continue
                m = e.get('message') or {}
                c = m.get('content')
                if isinstance(c, list):
                    texts = [x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text']
                    c = '\n'.join(texts)
                if not isinstance(c, str):
                    continue
                t = c.strip()
                if not t or t.startswith('<') or t.startswith('[') or 'tool_result' in t[:40] or t.startswith('Caveat:'):
                    continue
                t = re.sub(r'\s+', ' ', t)[:240]
                if t in seen or len(t) < 8:
                    continue
                seen.add(t)
                out.append(t)
    except Exception:
        pass
with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(len(out))
