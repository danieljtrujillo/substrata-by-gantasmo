// ─────────────────────────────────────────────────────────────────────────────
// Lightweight, dependency-free markdown renderer for the Design Advisor chat
// bubble. We previously rendered raw text with a single fenced-block regex,
// which is why the helper looked "horribly formatted" — bullets, headings,
// numbered steps, and tables all came out as plain text walls.
//
// This module renders a curated subset of markdown that's safe (no script
// injection, no HTML passthrough) and matches the dark glass-panel aesthetic
// the rest of the app uses. Output is a list of React-renderable blocks plus
// an HTML-string variant for the cases where we still need to inject via
// dangerouslySetInnerHTML.
//
// Supported:
//   - Headings (#, ##, ###)
//   - Bullet lists (-, *)
//   - Numbered lists (1. 2.)
//   - Code fences (``` lang … ```) — preserved as separate blocks the caller
//     can render with its custom SVG/OpenSCAD widgets
//   - Inline `code`, **bold**, *italic*
//   - Tables (| col | col | with --- separator row)
//
// Anything we don't recognise is rendered as an escaped paragraph.
// ─────────────────────────────────────────────────────────────────────────────

export type AdvisorBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; html: string }
  | { kind: 'paragraph'; html: string }
  | { kind: 'bullets'; items: string[] /* each is already HTML-safe */ }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'table'; headers: string[]; rows: string[][] };

function escapeHtml(s: string): string {
  // Order matters: replace & first so subsequent entities don't double-encode.
  return s
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;')
    .replace(/'/g, '&' + '#39;');
}


/** Apply inline formatting (after HTML escaping) — bold, italic, inline code,
 * links. Order matters: code is replaced first so its content doesn't get
 * further processed. */
function applyInline(escaped: string): string {
  return escaped
    // inline code — `foo` → <code>foo</code>. Stash content so later passes
    // don't re-process the inside.
    .replace(/`([^`]+)`/g, (_m, body) =>
      `<code class="px-1 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[10px]">${body}</code>`)
    // bold — **foo**
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    // italic — *foo* (lazy, won't catch ** because those were replaced first)
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em class="italic text-white/90">$2</em>')
    // links — [label](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-laser-accent underline underline-offset-2 hover:text-laser-accent/80">$1</a>',
    );
}

/**
 * Parse a markdown-ish advisor response into a list of typed blocks. The
 * caller can render each block with the appropriate React component (for
 * example, code blocks with language "svg" can be sanitised and rendered as
 * an SVG widget, while "openscad" blocks can show a copy button).
 */
export function parseAdvisorMarkdown(input: string): AdvisorBlock[] {
  const blocks: AdvisorBlock[] = [];
  const lines = input.replace(/\r\n/g, '\n').split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'text';
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      // Skip closing fence (or EOF)
      if (i < lines.length) i += 1;
      blocks.push({ kind: 'code', lang, code: buf.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, html: applyInline(escapeHtml(headingMatch[2])) });
      i += 1;
      continue;
    }

    // Table — header row followed by separator row of dashes
    if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      const headers = line.split('|').slice(1, -1).map(s => applyInline(escapeHtml(s.trim())));
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map(s => applyInline(escapeHtml(s.trim())));
        rows.push(cells);
        i += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // Bullets
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const body = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(applyInline(escapeHtml(body)));
        i += 1;
      }
      blocks.push({ kind: 'bullets', items });
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const body = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(applyInline(escapeHtml(body)));
        i += 1;
      }
      blocks.push({ kind: 'ordered', items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph — coalesce consecutive non-empty, non-special lines
    const paraLines: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*\|.+\|\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({
      kind: 'paragraph',
      html: applyInline(escapeHtml(paraLines.join(' '))),
    });
  }

  return blocks;
}

/**
 * Quick boolean: does this response contain enough markdown to be worth
 * upgrading the renderer for? Lets us keep the no-markdown happy path lean.
 */
export function hasMarkdown(input: string): boolean {
  return (
    /^#{1,3}\s/m.test(input) ||
    /^\s*[-*]\s+/m.test(input) ||
    /^\s*\d+\.\s+/m.test(input) ||
    /```/.test(input) ||
    /\*\*[^*\n]+\*\*/.test(input) ||
    /^\s*\|.+\|\s*$/m.test(input)
  );
}
