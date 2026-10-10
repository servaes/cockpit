"""Run the band's kind patterns (ported from register.tsx) over prompts.txt: how many land in each kind,
samples per kind to spot false positives, and the 'quick' leftovers to spot missed synonyms."""
import re, collections, random, sys
KIND = [
 ('risky', r"\b(rebase|merge|deploy\w*|publica\w*|publish\w*|ship\w*|apag\w*|delet\w*|remove the|drop|migra\w* (os )?dados|migrations?|force.?push|reset --hard)\b|rm -rf"),
 ('think', r"\b(prd|arquitetur\w*|architect\w*|decid\w*|decisions?|trade.?offs?|vale a pena|worth it|seguran[çc]a|security|threat|rfc|estrat[ée]gi\w*|strategy)\b"),
 ('image', r"\b(imagem|imagens|images?|[íi]cones?|icons?|logos?|ilustra\w*|illustrat\w*|thumbnails?|banners?|png|jpe?g)\b"),
 ('video', r"\b(v[íi]deos?|anima[çc][ãa]o|animation|remotion|mp4)\b"),
 ('data', r"\b(gr[áa]ficos?|charts?|graphs?|dashboards?|plot|visualiz\w*)\b"),
 ('doc', r"\b(deck|slides?|apresenta[çc][ãa]o|presentation|relat[óo]rio|report|pdf|docx|pptx|planilha|spreadsheet|xlsx)\b"),
 ('design', r"\b(telas?|screens?|layout|landing|ui|ux|design|mockups?|visual)\b"),
 ('research', r"\b(pesquis\w*|research|o que [ée]|what is|what are|quanto custa|how much|look up|novidades|latest|pre[çc]os?|prices?)\b"),
]
HELPER = r"\b(procur\w*|busc\w*|search\w*|find|grep|list\w*|lista\w*|rod[ae]\w* os testes|execut\w* os testes|run (the )?tests?( suite)?|lint\w*|typecheck|renome\w*|rename\w*)\b"
AGENTS = r"^\/cockpit:crew\b|\b(agent\w*|subagent\w*|paralel\w*|parallel\w*|crew|workflows?|fan.?out)\b"
BUILD = r"\b(cri[ae]r?|implement\w*|constru\w*|build\w*|creat\w*|planej\w*|plan|refator\w*|refactor\w*|redesign\w*|migr\w*|features?|scaffold\w*)\b"
EDIT = r"\b(corrig\w*|fix\w*|mud[ae]\w*|chang\w*|adicion\w*|add\w*|remov\w*|tir[ae]\w*|atualiz\w*|updat\w*|ajust\w*|renome\w*|renam\w*|troc\w*|bugs?|erros?|errors?)\b"
def kind(t):
    l = t.lower()
    for k, r in KIND:
        if re.search(r, l): return k
    if len(t) < 300 and re.search(HELPER, l): return 'mechanical'
    if re.search(AGENTS, l): return 'build'
    if len(t) > 600 or re.search(BUILD, l): return 'build'
    if re.search(EDIT, l): return 'fix'
    return 'quick'
lines = [l for l in open('prompts.txt', encoding='utf-8').read().split('\n') if l]
by = collections.defaultdict(list)
for l in lines: by[kind(l)].append(l)
random.seed(1)
for k in ['risky','think','image','video','data','doc','design','research','mechanical','build','fix','quick']:
    xs = by[k]
    print(f"\n=== {k}: {len(xs)}")
    for x in random.sample(xs, min(len(xs), int(sys.argv[1]) if k != 'quick' else int(sys.argv[2]))):
        print('  -', x[:150])
