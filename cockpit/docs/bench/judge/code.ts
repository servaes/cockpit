5890: const quoteArg = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`
5891: 
5892: /** What Codex is asked to do, as a command Claude runs: read-only, nothing persisted, in a folder holding only what it needs. */
5893: function codexSecondOpinion(): string {
5894:   return (
5895:     `put only the material it needs (the PRD section, the plan, the diff; never the whole repository) in a new temp folder and run ` +
5896:     `${quoteArg(crew.codexBin)} exec --sandbox read-only --ephemeral --skip-git-repo-check -C <that folder> ` +
5897:     `"Second opinion, read-only: list at most 5 concrete problems in these files, each in one line, most serious first." ` +
5898:     `It runs Codex's strongest configured model. Show what it found, as data, and say which points you take and why.`
5899:   )
5900: }
5901: 
5902: /** The note a sent message carries, or null when plain work here needs none. */
5903: function routeNote(r: Routed, text: string, cwd: string): string | null {
5904:   const t = text.trim()
5905:   // a button's prefix already says what to do; a short reply is the person deciding
5906:   if (t.startsWith(CREW_PREFIX.trim()) || t.startsWith(PLAN_FIRST.trim()) || t.startsWith(HELPER_HEAD) || r.why === 'a short reply') return null
5907:   const say: string[] = []
5908:   const lane = r.lane
5909:   if (r.route === 'helper' && lane.model !== 'codex') {
5910:     say.push(`Delegate this to one subagent: the Agent tool with model "${lane.model}"${lane.specialist ? `, told to use ${lane.specialist}` : ''}, with a self-contained brief. Relay its result in a few lines.`)
5911:   } else if (r.route === 'plan') {
5912:     say.push('Plan first: reply with a short plan (the steps, what each touches, rough cost) and wait for the OK before changing anything.')
5913:   } else if (r.route === 'crew') {
5914:     say.push('This is crew-sized: offer /cockpit:crew in one line and wait for the answer.')
5915:   } else if (r.route === 'chat') {
5916:     const m = lane.model === 'codex' ? '' : FAMILY_NAME[lane.model]
5917:     say.push(`Say once, in one line, that the New chat button above the prompt would run this${m ? ` on ${m}` : ''} with this chat's handoff note; then carry on here.`)
5918:   }
5919:   if (r.kind === 'image') {
5920:     say.push(
5921:       codexOn()
5922:         ? `Make the image through Codex: ${quoteArg(crew.codexBin)} exec --sandbox workspace-write --ephemeral -C ${quoteArg(cwd || '.')} "<what to draw, and the file path to save it to>". Say Codex made it and where it is.`
5923:         : 'Claude cannot make raster images: say so in one line (Codex: on in the crew row would make it), and offer an SVG or a mockup meanwhile.',
5924:     )
5925:   } else if ((r.kind === 'think' || r.kind === 'risky') && codexOn()) {
5926:     say.push(`${r.kind === 'risky' ? 'Before running it' : 'When the answer is ready'}, get a second opinion from Codex: ${codexSecondOpinion()}`)
5927:   } else if (lane.specialist && r.route !== 'helper' && lane.model !== 'codex' && !lane.specialist.startsWith('Codex')) {
5928:     say.push(`Use ${lane.specialist}.`)
5929:   }
5930:   if (say.length === 0 && !codexOn()) return null
5931:   return `Cockpit route for this message: ${r.line.replace(/^→ /, '')}. ${say.join(' ')}${codexOn() ? ' Codex is on.' : ''}`.trim()
5932: }
5933: 
5934: /** The sent message gets its route note as context, from the composer only. */
5935: async function crewPromptSubmit($: EngineInterface, e: any): Promise<any> {
5936:   if (e.origin?.kind !== 'composer' || typeof e.text !== 'string' || e.text.trim().startsWith('/')) return e
5937:   const view = estimateView(await $.clock.now())
5938:   const r = routeOf(e.text, view?.level ?? null, C.ctx)
5939:   if (!r) return e
5940:   const note = routeNote(r, e.text, await $.session.cwd().catch(() => ''))
5941:   return note ? { ...e, context: [...(e.context ?? []), note] } : e
5942: }
5943: 
5944: // The picker may name a bare family; it is priced as that family's newest model.
