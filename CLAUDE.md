# SUBSTRATA — Project Conventions

This file is read by Claude Code on every session. Keep it short; expand only
when a rule is repeatedly violated.

## Tailwind CSS — canonical classes are MANDATORY

This project is on **Tailwind CSS v4.3+**. In v4 the spacing scale, z-index,
ring widths, and many other utilities accept **bare numeric values directly**.
Arbitrary-value brackets (`w-[200px]`, `z-[100]`) are only permitted when no
canonical utility exists for the desired value.

### Rule

> **Never write an arbitrary-value class (`utility-[value]`) when a canonical
> Tailwind v4 utility exists for the same value.**

The Tailwind language server flags these in the editor as
`suggestCanonicalClasses` warnings. Treat the warnings as errors: fix the
class, do not suppress.

### Conversion cheatsheet

The default `--spacing` scale is `0.25rem` (4px). Spacing utilities scale
linearly: `w-1 = 4px`, `w-2 = 8px`, … `w-50 = 200px`, `w-100 = 400px`.

| Forbidden                | Canonical          | Math               |
|--------------------------|--------------------|--------------------|
| `w-[200px]`              | `w-50`             | 200 / 4 = 50       |
| `max-w-[160px]`          | `max-w-40`         | 160 / 4 = 40       |
| `min-h-[32px]`           | `min-h-8`          | 32 / 4 = 8         |
| `max-h-[300px]`          | `max-h-75`         | 300 / 4 = 75       |
| `w-[420px]`              | `w-105`            | 420 / 4 = 105      |
| `z-[100]`                | `z-100`            | bare integer       |
| `z-[200]`                | `z-200`            | bare integer       |
| `ring-[3px]`             | `ring-3`           | bare integer       |
| `gap-[24px]`             | `gap-6`            | 24 / 4 = 6         |

### When arbitrary values ARE allowed

Keep `utility-[value]` only when there is no canonical form, e.g.:

- Custom hex colours: `text-[#00f2ff]`
- Calc expressions: `h-[calc(100vh-280px)]`, `max-w-[calc(100%-2rem)]`
- Non-spacing percentages: `w-[85%]`, `max-h-[70%]`
- Custom font sizes that don't match the type scale: `text-[7px]`, `text-[0.8rem]`
- Custom radii that don't match `sm/md/lg/xl/2xl/3xl`: `rounded-[20px]`
- Box-shadow / gradient values: `shadow-[0_0_15px_rgba(...)]`,
  `bg-[radial-gradient(...)]`
- Letter spacing in em: `tracking-[0.3em]`
- Non-standard scale: `scale-[0.98]`
- Negative bracket spacing for unusual offsets: `bottom-[-5px]`
- Aspect ratios: `aspect-[4/3]`
- Selector-style brackets (NOT values): `data-[state=open]`, `has-[>img]`,
  `group-data-[disabled=true]` — these are part of the variant syntax, not
  arbitrary values.

### Self-check before committing

Run this before any PR that touches `*.tsx`/`*.ts`/`*.css`:

```bash
# List every arbitrary-value class in the diff. Review each one.
git diff --unified=0 -- '*.tsx' '*.ts' '*.css' \
  | grep -oE '\b[a-z-]+-\[[^\[]+\]' \
  | grep -vE '^(data|group-data|has|has-data|in-data|not-aria|not-data|peer|peer-data|aria)-\[' \
  | sort -u
```

For each line in the output, confirm a canonical form does not exist. If one
does, switch to it.

### Why this matters

- Smaller generated CSS — arbitrary values bypass the optimised class lookup.
- Consistent design vocabulary — `w-50` reads instantly; `w-[200px]` requires
  arithmetic.
- Editor support — the Tailwind language server suggests canonical utilities;
  ignoring the suggestions produces a wall of warnings that hides real bugs.
- Refactors — global spacing-scale changes (e.g. switch from 4px to 8px base)
  propagate through canonical classes automatically.

## Other project conventions

- **Gemini API key NEVER lives in the browser.** All calls go through
  `functions/api/ai/relay.ts`. The client uses `fetch('/api/ai/relay', …)`,
  never `new GoogleGenAI({apiKey})`. If you need a new Gemini feature on
  the client, add it to the relay first. `VITE_GEMINI_API_KEY` no longer
  exists — set `GEMINI_API_KEY` as a Cloudflare Pages env binding.
- **Models / TTS voices** live in `src/services/geminiService.ts:MODELS` and
  `src/services/ttsService.ts:TTS_VOICES, TTS_MODEL`. Upgrade in those two
  files — every callsite uses the constants.
- **OpenSCAD rendering** prefers `src/lib/openscadParser.ts:evaluateOpenSCAD`
  for the AST path (handles polyhedron, linear_extrude, modules, for-loops,
  variables). The legacy regex parser in `App.tsx:parseOpenSCAD` is the
  fallback for code the AST evaluator chokes on. Don't add new features to
  the regex parser — extend the AST evaluator instead.
- **`security_spec.md`** is the authoritative security document. Update it
  when changing auth, sessions, cookies, D1 access, or the AI relay.
- **No `dangerouslySetInnerHTML` on user-controlled input** — see
  security_spec.md SEC-6 for the one open exception (sanitised).
