# SUBSTRATA Claude Code workspace

`.claude/` holds prompts and references that get loaded automatically by
Claude Code in this repo.

- `CLAUDE.md` (in the repo root, not here) — project-wide rules. Read on every
  session.
- `.claude/notes/` — drop-in references for specific subsystems.

## House rules

1. **Tailwind v4.3 canonical classes are mandatory.** See `CLAUDE.md` §
   "Tailwind CSS — canonical classes are MANDATORY" before writing any
   `className`. Never emit `utility-[value]` when a canonical utility exists.
2. Model IDs and TTS voices live in `src/services/geminiService.ts:MODELS`
   and `src/services/ttsService.ts:TTS_MODEL/TTS_VOICES`. Edit those constants,
   not the callsites.
3. Security model is in `security_spec.md`. Update it alongside any auth /
   session / cookie / D1 change.
