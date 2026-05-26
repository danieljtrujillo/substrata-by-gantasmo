# Tailwind v4.3 — canonical-class reference

Reference card for Claude (and humans) when editing className strings in this
repo. The full rule is in the root `CLAUDE.md`. This file is the lookup table.

## Spacing utilities

`--spacing` defaults to **0.25rem (4px)**. Multiply the bare numeric class by
4 to get px:

| Class       | px     | Class        | px      |
|-------------|--------|--------------|---------|
| `*-0.5`     | 2px    | `*-12`       | 48px    |
| `*-1`       | 4px    | `*-16`       | 64px    |
| `*-1.5`     | 6px    | `*-20`       | 80px    |
| `*-2`       | 8px    | `*-24`       | 96px    |
| `*-2.5`     | 10px   | `*-32`       | 128px   |
| `*-3`       | 12px   | `*-40`       | 160px   |
| `*-4`       | 16px   | `*-50`       | 200px   |
| `*-5`       | 20px   | `*-64`       | 256px   |
| `*-6`       | 24px   | `*-75`       | 300px   |
| `*-7`       | 28px   | `*-100`      | 400px   |
| `*-8`       | 32px   | `*-110`      | 440px   |
| `*-10`      | 40px   | `*-128`      | 512px   |

Applies to: `w`, `h`, `min-w`, `min-h`, `max-w`, `max-h`, `m`, `mt`, `mr`,
`mb`, `ml`, `mx`, `my`, `p`, `pt`, `pr`, `pb`, `pl`, `px`, `py`, `gap`,
`gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`, `inset`, `inset-x`,
`inset-y`, `space-x`, `space-y`, `size`, `translate-x`, `translate-y`.

## z-index

Any positive integer is canonical: `z-1`, `z-10`, `z-50`, `z-100`, `z-200`,
`z-9999`. Never `z-[N]`.

## ring-width

Bare integer: `ring-0`, `ring-1`, `ring-2`, `ring-3`, `ring-4`, `ring-8`. The
old `ring` (no number) still means `ring-3` by default.

## Border width

Same — bare integer: `border-0`, `border-2`, `border-4`, `border-8`.

## Opacity modifier on colours

Use slash syntax: `bg-black/40`, `text-white/60`, not `bg-[#00000066]`.

## Cases that MUST stay arbitrary

- Custom hex colours: `text-[#00f2ff]`, `bg-[#0a0a0a]`
- `calc()`: `h-[calc(100vh-280px)]`, `max-w-[calc(100%-2rem)]`
- Percentages that aren't `1/2`/`1/3`/`1/4`/etc: `w-[85%]`, `max-h-[70%]`
- Font sizes outside the type scale: `text-[7px]`, `text-[0.8rem]`,
  `text-[13px]`
- Non-standard radii: `rounded-[20px]`, `rounded-[inherit]`,
  `rounded-[min(var(--radius-md),10px)]`
- Box-shadows: `shadow-[0_0_15px_rgba(0,242,255,0.4)]`
- Gradients: `bg-[radial-gradient(#ffffff10_1px,transparent_1px)]`
- Letter-spacing in em: `tracking-[0.15em]`, `tracking-[0.3em]`
- Non-standard scale / rotate: `scale-[0.98]`
- Aspect ratios that aren't `square`/`video`: `aspect-[4/3]`
- Negative spacings outside the scale: `bottom-[-5px]`
- Backdrop-blur outside `xs/sm/md/lg/xl/2xl/3xl`: `backdrop-blur-[15px]`
- Selector-style brackets (variant syntax, not values): `data-[state=open]`,
  `has-[>img:first-child]`, `group-data-[disabled=true]`, `not-aria-[haspopup]`

## Workflow

Before every edit that introduces a new `className`:

1. Compute the value you want.
2. Check the table above — is there a canonical numeric utility for it?
3. If yes, use the canonical form. If no, use `utility-[value]`.

Before sending a change for review:

```bash
git diff --unified=0 -- '*.tsx' '*.ts' '*.css' \
  | grep -oE '\b[a-z-]+-\[[^\[]+\]' \
  | grep -vE '^(data|group-data|has|has-data|in-data|not-aria|not-data|peer|peer-data|aria)-\['
```

Any line that comes out must be in the "stay arbitrary" list above.
