import React, { useState, useRef, useCallback, useEffect } from 'react';
import mermaid from 'mermaid';
import {
  BookOpen, Network, Sparkles, Code, Shield, Wrench, GitBranch,
  ChevronRight, ChevronDown, FileDown, FileText, Printer,
  Search, X, ArrowUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DOCUMENTATION, type DocSection } from '../docs/documentationContent';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#16213e',
    primaryTextColor: '#e0e0e0',
    primaryBorderColor: '#00f2ff',
    lineColor: '#00f2ff',
    secondaryColor: '#1a1a2e',
    tertiaryColor: '#0d0d15',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: '13px',
  },
  flowchart: { curve: 'basis', padding: 12 },
  sequence: { actorMargin: 50, mirrorActors: false },
});

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  BookOpen, Network, Sparkles, Code, Shield, Wrench, GitBranch,
};

/* ── Minimal Markdown → HTML renderer ──────────────────────── */
let mermaidBlockId = 0;

function renderMarkdown(md: string): string {
  let html = md
    // Code blocks (fenced) — Mermaid blocks get a special container
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      if (lang === 'mermaid') {
        const id = `mermaid-block-${mermaidBlockId++}`;
        return `<div class="doc-mermaid-container"><pre class="mermaid" id="${id}">${code.trim()}</pre></div>`;
      }
      const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre class="doc-code-block"><code class="language-${lang}">${escaped}</code></pre>`;
    })
    // Images: ![alt](src)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      return `<div class="doc-image-container"><img src="${src}" alt="${alt}" class="doc-image" /><p class="doc-image-caption">${alt}</p></div>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="doc-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="doc-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="doc-h1">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="doc-hr"/>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return '<!-- table-sep -->';
      const cellHtml = cells.map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    // Wrap tables
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<div class="doc-table-wrap"><table class="doc-table">$1</table></div>')
    // Remove table separator comments
    .replace(/<!-- table-sep -->\n?/g, '')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="doc-list">$1</ul>')
    // Paragraphs (non-empty lines that aren't already HTML)
    .replace(/^(?!<[a-z/!])((?:.(?!^<))+)$/gm, (match) => {
      const trimmed = match.trim();
      if (!trimmed || trimmed.startsWith('<')) return match;
      return `<p class="doc-p">${trimmed}</p>`;
    });

  return html;
}

/* ── Export utilities ──────────────────────────────────────── */
function getAllMarkdown(): string {
  return DOCUMENTATION.map(s => s.content).join('\n\n---\n\n');
}

function exportAsHTML() {
  const markdown = getAllMarkdown();
  const body = renderMarkdown(markdown);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUBSTRATA by GANTASMO — Documentation</title>
  <style>
    :root { --accent: #00f2ff; --bg: #0d0d15; --surface: #16213e; --text: #e0e0e0; --muted: #888; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.7; padding: 2rem; max-width: 960px; margin: 0 auto; }
    h1 { color: var(--accent); font-size: 2rem; margin: 2rem 0 1rem; border-bottom: 1px solid rgba(255,255,255,.1); padding-bottom: .5rem; }
    h2 { color: var(--accent); font-size: 1.4rem; margin: 1.8rem 0 .8rem; }
    h3 { color: #fff; font-size: 1.1rem; margin: 1.4rem 0 .6rem; }
    p { margin-bottom: .8rem; }
    code { background: rgba(0,242,255,.1); color: var(--accent); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; color: #ccc; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid rgba(255,255,255,.1); padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
    th { background: rgba(0,242,255,.05); color: var(--accent); }
    tr:first-child td { background: rgba(0,242,255,.05); color: var(--accent); font-weight: 600; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,.1); margin: 2rem 0; }
    ul { padding-left: 1.5rem; margin: .5rem 0; }
    li { margin-bottom: .3rem; }
    strong { color: #fff; }
    .doc-mermaid-container { margin: 1.5rem 0; background: rgba(0,0,0,.3); border-radius: 8px; padding: 1.5rem; border: 1px solid rgba(255,255,255,.1); }
    .mermaid { display: flex; justify-content: center; }
    .doc-image-container { margin: 1.5rem 0; text-align: center; }
    .doc-image { max-width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); }
    .doc-image-caption { font-size: 0.8em; color: var(--muted); margin-top: 0.5rem; }
    @media print { body { background: #fff; color: #222; } h1, h2, code { color: #0066cc; } pre { border-color: #ddd; } td, th { border-color: #ddd; } tr:first-child td { color: #0066cc; background: #f0f8ff; } }
  </style>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  </script>
</head>
<body>
${body}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'SUBSTRATA-Documentation.html';
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsPDF() {
  const markdown = getAllMarkdown();
  const body = renderMarkdown(markdown);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SUBSTRATA by GANTASMO — Documentation</title>
  <style>
    :root { --accent: #0066cc; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { color: #222; font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.7; padding: 2rem; max-width: 960px; margin: 0 auto; }
    h1 { color: var(--accent); font-size: 1.8rem; margin: 2rem 0 1rem; border-bottom: 2px solid #eee; padding-bottom: .5rem; }
    h2 { color: var(--accent); font-size: 1.3rem; margin: 1.5rem 0 .7rem; }
    h3 { font-size: 1.05rem; margin: 1.2rem 0 .5rem; }
    p { margin-bottom: .7rem; }
    code { background: #f0f8ff; color: var(--accent); padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.85em; }
    pre { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 1rem; overflow-x: auto; margin: 1rem 0; font-size: 0.85rem; }
    pre code { background: none; color: #333; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.85rem; }
    tr:first-child td { background: #f0f8ff; color: var(--accent); font-weight: 600; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 2rem 0; }
    ul { padding-left: 1.5rem; margin: .5rem 0; }
    li { margin-bottom: .2rem; }
    @page { margin: 1.5cm; }
  </style>
</head>
<body>
${body}
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
  printWindow.document.close();
}

/* ── Sidebar nav item ─────────────────────────────────────── */
function NavItem({ section, isActive, onClick }: { section: DocSection; isActive: boolean; onClick: () => void }) {
  const IconComponent = ICON_MAP[section.icon] || BookOpen;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all ${
        isActive
          ? 'bg-white/10 text-[#00f2ff] shadow-inner'
          : 'text-white/60 hover:text-white/90 hover:bg-white/5'
      }`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{section.title}</span>
      <ChevronRight className={`w-3 h-3 ml-auto shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
    </button>
  );
}

/* ── Main Documentation Viewer ────────────────────────────── */
export function DocumentationViewer() {
  const [activeSectionId, setActiveSectionId] = useState(DOCUMENTATION[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSection = DOCUMENTATION.find(s => s.id === activeSectionId) || DOCUMENTATION[0];

  // Render mermaid diagrams after content changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      const container = contentRef.current;
      if (!container) return;
      const mermaidEls = container.querySelectorAll('pre.mermaid:not([data-processed])');
      for (const el of mermaidEls) {
        const id = el.id || `mermaid-${Date.now()}`;
        try {
          const { svg } = await mermaid.render(id + '-svg', el.textContent || '');
          const wrapper = document.createElement('div');
          wrapper.className = 'doc-mermaid-rendered';
          wrapper.innerHTML = svg;
          el.replaceWith(wrapper);
        } catch (e) {
          console.warn('Mermaid render failed for', id, e);
          el.setAttribute('data-processed', 'error');
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSectionId]);

  const filteredSections = searchQuery
    ? DOCUMENTATION.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : DOCUMENTATION;

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between glass-panel border-white/10 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#00f2ff]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Documentation</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportAsHTML}
            className="h-7 text-[10px] font-bold uppercase text-white/60 hover:text-[#00f2ff] hover:bg-white/5"
          >
            <FileText className="w-3 h-3 mr-1" /> HTML
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportAsPDF}
            className="h-7 text-[10px] font-bold uppercase text-white/60 hover:text-[#00f2ff] hover:bg-white/5"
          >
            <Printer className="w-3 h-3 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-4 min-h-[calc(100vh-280px)]">
        {/* Sidebar Navigation */}
        <div className="w-48 shrink-0 space-y-1">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass-input border-white/10 bg-black/20 h-8 text-xs pl-7 pr-7"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {filteredSections.map(section => (
            <NavItem
              key={section.id}
              section={section}
              isActive={activeSectionId === section.id}
              onClick={() => {
                setActiveSectionId(section.id);
                scrollToTop();
              }}
            />
          ))}

          {filteredSections.length === 0 && (
            <p className="text-[10px] text-white/40 text-center py-4">No matching sections</p>
          )}
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 glass-panel border-white/10 rounded-xl" ref={contentRef}>
          <div
            className="doc-content p-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSection.content) }}
          />
        </ScrollArea>
      </div>
    </div>
  );
}
