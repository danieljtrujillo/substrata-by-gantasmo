// Recursive-descent parser + evaluator for the subset of OpenSCAD that the
// blueprint generator emits. Handles modules, transforms (translate / rotate
// / scale / mirror / color), CSG (union / difference / intersection / hull),
// for-loops, variable assignment + lookup, and the primitives we render:
// cube, cylinder, sphere, polyhedron, linear_extrude(polygon).
//
// Goals:
//  - Replace the previous regex parser for the things it couldn't handle
//    (polyhedron from displacement-mesh, linear_extrude(polygon) from profile
//    extrusion, nested transforms, for-loops, variables).
//  - Produce a flat list of `EvaluatedPrimitive`s pre-baked in world space so
//    the React Three Fiber renderer just emits geometry per primitive.
//  - Fail gracefully: a syntax error throws a `ParseError` so the caller can
//    fall back to the old regex parser (App.tsx).
//
// Non-goals: list comprehensions, the `$fn`/`$fa`/`$fs` system beyond a flat
// constant, recursive modules, `let()`, `each`, custom functions. A line that
// exercises one of those is parsed best-effort and unknown calls are silently
// ignored — same behaviour as a partial OpenSCAD interpreter.

// ── Token types ────────────────────────────────────────────────────────────
type TokenKind =
  | 'number' | 'string' | 'ident'
  | '(' | ')' | '[' | ']' | '{' | '}'
  | ',' | ';' | '=' | '?' | ':' | '!'
  | '+' | '-' | '*' | '/' | '%'
  | '<' | '>' | '<=' | '>=' | '==' | '!='
  | '&&' | '||'
  | 'eof';

interface Token { kind: TokenKind; value: string; pos: number; }

export class ParseError extends Error {
  constructor(msg: string, public readonly pos: number) { super(`OpenSCAD parse: ${msg} (pos ${pos})`); }
}

// ── Tokenizer ──────────────────────────────────────────────────────────────
function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const peek = (n = 0) => src[i + n] ?? '';
  while (i < src.length) {
    const c = src[i];
    // whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    // line comment
    if (c === '/' && peek(1) === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    // block comment
    if (c === '/' && peek(1) === '*') { i += 2; while (i < src.length && !(src[i] === '*' && peek(1) === '/')) i++; i += 2; continue; }
    // string
    if (c === '"') {
      const start = i; i++;
      let s = '';
      while (i < src.length && src[i] !== '"') { s += src[i]; i++; }
      i++;
      out.push({ kind: 'string', value: s, pos: start });
      continue;
    }
    // number — supports leading minus only when prev token is operator-ish
    if (c >= '0' && c <= '9' || (c === '.' && peek(1) >= '0' && peek(1) <= '9')) {
      const start = i;
      while (i < src.length && (src[i] >= '0' && src[i] <= '9' || src[i] === '.' || src[i] === 'e' || src[i] === 'E' || src[i] === '-' || src[i] === '+')) {
        // only allow +/- after e/E
        if ((src[i] === '+' || src[i] === '-') && !(src[i - 1] === 'e' || src[i - 1] === 'E')) break;
        i++;
      }
      out.push({ kind: 'number', value: src.slice(start, i), pos: start });
      continue;
    }
    // identifier / keyword
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$') {
      const start = i;
      while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) i++;
      out.push({ kind: 'ident', value: src.slice(start, i), pos: start });
      continue;
    }
    // two-char operators
    const two = c + peek(1);
    if (two === '<=' || two === '>=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
      out.push({ kind: two as TokenKind, value: two, pos: i });
      i += 2; continue;
    }
    // single-char
    if ('()[]{},;=?:!+-*/%<>'.includes(c)) {
      out.push({ kind: c as TokenKind, value: c, pos: i });
      i++; continue;
    }
    throw new ParseError(`unexpected character '${c}'`, i);
  }
  out.push({ kind: 'eof', value: '', pos: src.length });
  return out;
}

// ── AST ────────────────────────────────────────────────────────────────────
// Statements are nodes that produce geometry or modify the environment.
// Expressions are evaluated to numbers, vectors, strings, or booleans.

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'ident'; name: string }
  | { kind: 'vec'; items: Expr[] }
  | { kind: 'neg' | 'not'; expr: Expr }
  | { kind: 'bin'; op: string; a: Expr; b: Expr }
  | { kind: 'cond'; c: Expr; t: Expr; f: Expr };

export type Stmt =
  | { kind: 'assign'; name: string; value: Expr }
  | { kind: 'module-decl'; name: string; params: Array<{ name: string; def?: Expr }>; body: Stmt[] }
  | { kind: 'call'; name: string; args: CallArg[]; children: Stmt[] }
  | { kind: 'for'; vars: Array<{ name: string; range: Expr }>; body: Stmt[] }
  | { kind: 'if'; cond: Expr; t: Stmt[]; f: Stmt[] }
  | { kind: 'block'; body: Stmt[] };

export interface CallArg { name?: string; value: Expr; }

// ── Parser ─────────────────────────────────────────────────────────────────
class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}

  private peek(off = 0): Token { return this.tokens[this.i + off]; }
  private eat(kind?: TokenKind): Token {
    const t = this.tokens[this.i];
    if (kind && t.kind !== kind) throw new ParseError(`expected ${kind} got ${t.kind}(${t.value})`, t.pos);
    this.i++;
    return t;
  }
  private match(kind: TokenKind): boolean { return this.peek().kind === kind; }
  private accept(kind: TokenKind): boolean { if (this.match(kind)) { this.i++; return true; } return false; }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (!this.match('eof')) stmts.push(this.parseStmt());
    return stmts;
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    // module declaration
    if (t.kind === 'ident' && t.value === 'module') return this.parseModuleDecl();
    // assignment vs call: `ident =` is assignment, otherwise call/control
    if (t.kind === 'ident' && t.value === 'for') return this.parseFor();
    if (t.kind === 'ident' && t.value === 'if')  return this.parseIf();
    if (t.kind === 'ident' && this.peek(1).kind === '=') return this.parseAssign();
    if (t.kind === '{') return this.parseBlock();
    if (t.kind === 'ident') return this.parseCall();
    if (t.kind === ';') { this.i++; return { kind: 'block', body: [] }; }
    throw new ParseError(`unexpected token ${t.kind}(${t.value})`, t.pos);
  }

  private parseModuleDecl(): Stmt {
    this.eat('ident'); // 'module'
    const name = this.eat('ident').value;
    this.eat('(');
    const params: Array<{ name: string; def?: Expr }> = [];
    if (!this.match(')')) {
      do {
        const pname = this.eat('ident').value;
        let def: Expr | undefined;
        if (this.accept('=')) def = this.parseExpr();
        params.push({ name: pname, def });
      } while (this.accept(','));
    }
    this.eat(')');
    const body = this.parseBlockBody();
    return { kind: 'module-decl', name, params, body };
  }

  private parseAssign(): Stmt {
    const name = this.eat('ident').value;
    this.eat('=');
    const value = this.parseExpr();
    this.accept(';');
    return { kind: 'assign', name, value };
  }

  private parseBlock(): Stmt {
    return { kind: 'block', body: this.parseBlockBody() };
  }

  private parseBlockBody(): Stmt[] {
    this.eat('{');
    const out: Stmt[] = [];
    while (!this.match('}') && !this.match('eof')) out.push(this.parseStmt());
    this.eat('}');
    return out;
  }

  private parseFor(): Stmt {
    this.eat('ident'); // 'for'
    this.eat('(');
    const vars: Array<{ name: string; range: Expr }> = [];
    do {
      const name = this.eat('ident').value;
      this.eat('=');
      const range = this.parseExpr();
      vars.push({ name, range });
    } while (this.accept(','));
    this.eat(')');
    const body = this.match('{') ? this.parseBlockBody() : [this.parseStmt()];
    return { kind: 'for', vars, body };
  }

  private parseIf(): Stmt {
    this.eat('ident'); // 'if'
    this.eat('(');
    const cond = this.parseExpr();
    this.eat(')');
    const t = this.match('{') ? this.parseBlockBody() : [this.parseStmt()];
    let f: Stmt[] = [];
    if (this.peek().kind === 'ident' && this.peek().value === 'else') {
      this.i++;
      f = this.match('{') ? this.parseBlockBody() : [this.parseStmt()];
    }
    return { kind: 'if', cond, t, f };
  }

  private parseCall(): Stmt {
    const name = this.eat('ident').value;
    let args: CallArg[] = [];
    if (this.accept('(')) {
      if (!this.match(')')) {
        do {
          // named arg?
          if (this.peek().kind === 'ident' && this.peek(1).kind === '=') {
            const aname = this.eat('ident').value;
            this.eat('=');
            args.push({ name: aname, value: this.parseExpr() });
          } else {
            args.push({ value: this.parseExpr() });
          }
        } while (this.accept(','));
      }
      this.eat(')');
    }
    let children: Stmt[] = [];
    if (this.match('{')) children = this.parseBlockBody();
    else if (!this.accept(';')) {
      // chained transform without semicolon: `translate([...]) cube(...)`
      if (!this.match('eof') && !this.match('}')) children = [this.parseStmt()];
    }
    return { kind: 'call', name, args, children };
  }

  // ── Expressions (Pratt-style precedence climber) ─────────────────────────
  parseExpr(): Expr { return this.parseTernary(); }

  private parseTernary(): Expr {
    const c = this.parseOr();
    if (this.accept('?')) {
      const t = this.parseExpr();
      this.eat(':');
      const f = this.parseExpr();
      return { kind: 'cond', c, t, f };
    }
    return c;
  }
  private parseOr(): Expr { let l = this.parseAnd(); while (this.accept('||')) { l = { kind: 'bin', op: '||', a: l, b: this.parseAnd() }; } return l; }
  private parseAnd(): Expr { let l = this.parseEq(); while (this.accept('&&')) { l = { kind: 'bin', op: '&&', a: l, b: this.parseEq() }; } return l; }
  private parseEq(): Expr {
    let l = this.parseRel();
    while (this.match('==') || this.match('!=')) { const op = this.eat().value; l = { kind: 'bin', op, a: l, b: this.parseRel() }; }
    return l;
  }
  private parseRel(): Expr {
    let l = this.parseAdd();
    while (this.match('<') || this.match('>') || this.match('<=') || this.match('>=')) { const op = this.eat().value; l = { kind: 'bin', op, a: l, b: this.parseAdd() }; }
    return l;
  }
  private parseAdd(): Expr {
    let l = this.parseMul();
    while (this.match('+') || this.match('-')) { const op = this.eat().value; l = { kind: 'bin', op, a: l, b: this.parseMul() }; }
    return l;
  }
  private parseMul(): Expr {
    let l = this.parseUnary();
    while (this.match('*') || this.match('/') || this.match('%')) { const op = this.eat().value; l = { kind: 'bin', op, a: l, b: this.parseUnary() }; }
    return l;
  }
  private parseUnary(): Expr {
    if (this.accept('-')) return { kind: 'neg', expr: this.parseUnary() };
    if (this.accept('!')) return { kind: 'not', expr: this.parseUnary() };
    return this.parsePrimary();
  }
  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === 'number') { this.i++; return { kind: 'num', value: parseFloat(t.value) }; }
    if (t.kind === 'string') { this.i++; return { kind: 'str', value: t.value }; }
    if (t.kind === '(') { this.i++; const e = this.parseExpr(); this.eat(')'); return e; }
    if (t.kind === '[') {
      this.i++;
      const items: Expr[] = [];
      if (!this.match(']')) {
        do { items.push(this.parseExpr()); } while (this.accept(','));
      }
      this.eat(']');
      return { kind: 'vec', items };
    }
    if (t.kind === 'ident') {
      this.i++;
      // function-style call in an expression: `cos(x)`, `sin(theta)` — evaluator handles these by name.
      if (this.accept('(')) {
        const items: Expr[] = [];
        if (!this.match(')')) {
          do { items.push(this.parseExpr()); } while (this.accept(','));
        }
        this.eat(')');
        // Encode call as `bin op='call' a=identifier b=vec(args)`. The evaluator dispatches by name.
        return { kind: 'bin', op: 'call', a: { kind: 'ident', name: t.value }, b: { kind: 'vec', items } };
      }
      return { kind: 'ident', name: t.value };
    }
    throw new ParseError(`unexpected primary token ${t.kind}(${t.value})`, t.pos);
  }

}

// ── Evaluator ──────────────────────────────────────────────────────────────
// Walks the AST and produces a flat list of EvaluatedPrimitive in world space.
// All transforms are pre-baked into the primitive's position/rotation/scale.

export type Vec3 = [number, number, number];

export type EvaluatedPrimitive =
  | { type: 'cube';      size: Vec3;    position: Vec3; rotation: Vec3; scale: Vec3; color: string; label: string; subtractive: boolean }
  | { type: 'sphere';    radius: number; segments: number; position: Vec3; rotation: Vec3; scale: Vec3; color: string; label: string; subtractive: boolean }
  | { type: 'cylinder';  r1: number; r2: number; h: number; segments: number; position: Vec3; rotation: Vec3; scale: Vec3; color: string; label: string; subtractive: boolean }
  | { type: 'polyhedron'; vertices: Vec3[]; faces: number[][]; position: Vec3; rotation: Vec3; scale: Vec3; color: string; label: string; subtractive: boolean }
  | { type: 'extrude';   polygon: Array<[number, number]>; height: number; position: Vec3; rotation: Vec3; scale: Vec3; color: string; label: string; subtractive: boolean };

interface Frame {
  vars: Map<string, unknown>;
  parent: Frame | null;
}

interface Transform { translate: Vec3; rotateDeg: Vec3; scale: Vec3; color?: string; }

const IDENT: Transform = { translate: [0, 0, 0], rotateDeg: [0, 0, 0], scale: [1, 1, 1] };

function composeTransforms(outer: Transform, inner: Transform): Transform {
  // Translation, then rotation around outer origin, then scale. Approximate
  // composition that matches OpenSCAD's apparent semantics for simple
  // sequential transforms — full SE(3) chains are overkill for our case.
  return {
    translate: [outer.translate[0] + inner.translate[0], outer.translate[1] + inner.translate[1], outer.translate[2] + inner.translate[2]],
    rotateDeg: [outer.rotateDeg[0] + inner.rotateDeg[0], outer.rotateDeg[1] + inner.rotateDeg[1], outer.rotateDeg[2] + inner.rotateDeg[2]],
    scale:     [outer.scale[0] * inner.scale[0], outer.scale[1] * inner.scale[1], outer.scale[2] * inner.scale[2]],
    color:     inner.color ?? outer.color,
  };
}

function asNum(v: unknown): number { return typeof v === 'number' ? v : 0; }
function asVec3(v: unknown, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (Array.isArray(v) && v.length >= 2) return [asNum(v[0]), asNum(v[1]), asNum(v[2] ?? 0)];
  if (typeof v === 'number') return [v, v, v];
  return fallback;
}
function lookup(frame: Frame, name: string): unknown {
  let f: Frame | null = frame;
  while (f) { if (f.vars.has(name)) return f.vars.get(name); f = f.parent; }
  return undefined;
}

class Evaluator {
  private out: EvaluatedPrimitive[] = [];
  private modules = new Map<string, { params: Array<{ name: string; def?: Expr }>; body: Stmt[] }>();
  private labelCounter = 0;
  private currentLabel = 'part';
  private partColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

  run(program: Stmt[]): EvaluatedPrimitive[] {
    const root: Frame = { vars: new Map(), parent: null };
    // First pass: hoist module declarations + assignments so for/calls can
    // reference siblings declared later (OpenSCAD has no strict order).
    for (const s of program) {
      if (s.kind === 'module-decl') this.modules.set(s.name, { params: s.params, body: s.body });
    }
    this.execStmts(program, root, IDENT, false);
    return this.out;
  }

  private execStmts(stmts: Stmt[], frame: Frame, xform: Transform, subtractive: boolean) {
    for (const s of stmts) this.execStmt(s, frame, xform, subtractive);
  }

  private execStmt(s: Stmt, frame: Frame, xform: Transform, subtractive: boolean) {
    switch (s.kind) {
      case 'assign':
        frame.vars.set(s.name, this.evalExpr(s.value, frame));
        return;
      case 'module-decl': return; // hoisted
      case 'block': this.execStmts(s.body, frame, xform, subtractive); return;
      case 'if': {
        const c = this.evalExpr(s.cond, frame);
        this.execStmts(c ? s.t : s.f, frame, xform, subtractive);
        return;
      }
      case 'for': {
        const ranges = s.vars.map(v => ({ name: v.name, vals: this.evalRange(v.range, frame) }));
        const cross = (depth: number, child: Frame) => {
          if (depth >= ranges.length) { this.execStmts(s.body, child, xform, subtractive); return; }
          for (const v of ranges[depth].vals) {
            const next: Frame = { vars: new Map([[ranges[depth].name, v]]), parent: child };
            cross(depth + 1, next);
          }
        };
        cross(0, frame);
        return;
      }
      case 'call': this.execCall(s, frame, xform, subtractive); return;
    }
  }

  private execCall(s: Extract<Stmt, { kind: 'call' }>, frame: Frame, xform: Transform, subtractive: boolean) {
    const args = this.resolveArgs(s.args, frame);
    const name = s.name;
    // ── Transforms ───────────────────────────────────────────────────────
    if (name === 'translate') {
      const t = asVec3(args.positional[0]);
      const next = composeTransforms(xform, { translate: t, rotateDeg: [0,0,0], scale: [1,1,1] });
      this.execStmts(s.children, frame, next, subtractive);
      return;
    }
    if (name === 'rotate') {
      const r = asVec3(args.positional[0]);
      const next = composeTransforms(xform, { translate: [0,0,0], rotateDeg: r, scale: [1,1,1] });
      this.execStmts(s.children, frame, next, subtractive);
      return;
    }
    if (name === 'scale') {
      const sc = asVec3(args.positional[0], [1, 1, 1]);
      const next = composeTransforms(xform, { translate: [0,0,0], rotateDeg: [0,0,0], scale: sc });
      this.execStmts(s.children, frame, next, subtractive);
      return;
    }
    if (name === 'mirror') {
      const m = asVec3(args.positional[0]);
      const sc: Vec3 = [m[0] ? -1 : 1, m[1] ? -1 : 1, m[2] ? -1 : 1];
      const next = composeTransforms(xform, { translate: [0,0,0], rotateDeg: [0,0,0], scale: sc });
      this.execStmts(s.children, frame, next, subtractive);
      return;
    }
    if (name === 'color') {
      const c = args.positional[0];
      const colorStr = typeof c === 'string' ? c : (Array.isArray(c) ? `rgb(${Math.round(asNum(c[0])*255)},${Math.round(asNum(c[1])*255)},${Math.round(asNum(c[2])*255)})` : undefined);
      const next = composeTransforms(xform, { translate: [0,0,0], rotateDeg: [0,0,0], scale: [1,1,1], color: colorStr });
      this.execStmts(s.children, frame, next, subtractive);
      return;
    }
    // ── CSG ───────────────────────────────────────────────────────────────
    if (name === 'union' || name === 'hull') {
      // union: just emit all children. hull: emit all children flagged so
      // the renderer can wrap them in a convex hull (Three.js ConvexGeometry).
      this.execStmts(s.children, frame, xform, subtractive);
      return;
    }
    if (name === 'difference') {
      // First child is additive; the rest are subtractive holes.
      if (s.children.length > 0) this.execStmt(s.children[0], frame, xform, subtractive);
      for (let i = 1; i < s.children.length; i++) this.execStmt(s.children[i], frame, xform, true);
      return;
    }
    if (name === 'intersection') {
      // We don't model boolean intersection — emit additively as union.
      this.execStmts(s.children, frame, xform, subtractive);
      return;
    }
    // ── Primitives ───────────────────────────────────────────────────────
    if (name === 'cube') return this.emitCube(args, xform, subtractive);
    if (name === 'cylinder') return this.emitCylinder(args, xform, subtractive);
    if (name === 'sphere') return this.emitSphere(args, xform, subtractive);
    if (name === 'polyhedron') return this.emitPolyhedron(args, xform, subtractive);
    if (name === 'linear_extrude') return this.emitExtrude(args, s.children, frame, xform, subtractive);
    if (name === 'polygon') return; // handled inline by linear_extrude
    // ── Module instantiation ──────────────────────────────────────────────
    const m = this.modules.get(name);
    if (m) {
      const child: Frame = { vars: new Map(), parent: frame };
      // Bind parameters: named first, then positional fill.
      const positional = args.positional;
      let posIdx = 0;
      for (const p of m.params) {
        if (args.named.has(p.name))       child.vars.set(p.name, args.named.get(p.name));
        else if (posIdx < positional.length) child.vars.set(p.name, positional[posIdx++]);
        else if (p.def)                   child.vars.set(p.name, this.evalExpr(p.def, frame));
      }
      const prevLabel = this.currentLabel;
      this.currentLabel = name;
      this.execStmts(m.body, child, xform, subtractive);
      this.currentLabel = prevLabel;
      return;
    }
    // Unknown call — silently skip children (renderer doesn't model it).
  }

  private emitCube(args: ResolvedArgs, xform: Transform, subtractive: boolean) {
    const size = (() => {
      const v = args.named.get('size') ?? args.positional[0];
      if (Array.isArray(v)) return asVec3(v, [1, 1, 1]);
      if (typeof v === 'number') return [v, v, v] as Vec3;
      return [1, 1, 1] as Vec3;
    })();
    const center = !!(args.named.get('center') ?? args.positional[1]);
    let pos = xform.translate;
    if (!center) {
      // OpenSCAD: cube grows in +x/+y/+z from origin unless centered.
      pos = [pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2];
    }
    this.out.push({
      type: 'cube', size, position: pos, rotation: xform.rotateDeg, scale: xform.scale,
      color: xform.color ?? this.pickColor(), label: this.makeLabel(), subtractive,
    });
  }

  private emitCylinder(args: ResolvedArgs, xform: Transform, subtractive: boolean) {
    const h  = asNum(args.named.get('h')  ?? args.positional[0] ?? 1);
    const r  = args.named.get('r')  ?? args.positional[1];
    const r1 = asNum(args.named.get('r1') ?? r ?? 0.5);
    const r2 = asNum(args.named.get('r2') ?? r ?? 0.5);
    const segments = Math.max(3, Math.round(asNum(args.named.get('$fn')) || 24));
    const center = !!args.named.get('center');
    const pos: Vec3 = center
      ? [xform.translate[0], xform.translate[1], xform.translate[2]]
      : [xform.translate[0], xform.translate[1], xform.translate[2] + h / 2];
    this.out.push({
      type: 'cylinder', r1, r2, h, segments,
      position: pos, rotation: xform.rotateDeg, scale: xform.scale,
      color: xform.color ?? this.pickColor(), label: this.makeLabel(), subtractive,
    });
  }

  private emitSphere(args: ResolvedArgs, xform: Transform, subtractive: boolean) {
    const r = asNum(args.named.get('r') ?? args.named.get('d') ?? args.positional[0] ?? 0.5);
    const radius = args.named.has('d') ? r / 2 : r;
    const segments = Math.max(4, Math.round(asNum(args.named.get('$fn')) || 16));
    this.out.push({
      type: 'sphere', radius, segments,
      position: xform.translate, rotation: xform.rotateDeg, scale: xform.scale,
      color: xform.color ?? this.pickColor(), label: this.makeLabel(), subtractive,
    });
  }

  private emitPolyhedron(args: ResolvedArgs, xform: Transform, subtractive: boolean) {
    const ptsRaw = args.named.get('points') ?? args.positional[0];
    const facesRaw = args.named.get('faces') ?? args.named.get('triangles') ?? args.positional[1];
    const vertices: Vec3[] = Array.isArray(ptsRaw)
      ? (ptsRaw as unknown[]).map(p => asVec3(p))
      : [];
    const faces: number[][] = Array.isArray(facesRaw)
      ? (facesRaw as unknown[]).map(f => Array.isArray(f) ? (f as unknown[]).map(asNum) : [])
      : [];
    if (vertices.length === 0 || faces.length === 0) return;
    this.out.push({
      type: 'polyhedron', vertices, faces,
      position: xform.translate, rotation: xform.rotateDeg, scale: xform.scale,
      color: xform.color ?? this.pickColor(), label: this.makeLabel(), subtractive,
    });
  }

  private emitExtrude(args: ResolvedArgs, children: Stmt[], frame: Frame, xform: Transform, subtractive: boolean) {
    const height = asNum(args.named.get('height') ?? args.positional[0] ?? 1);
    // linear_extrude wraps a polygon() child. Find its `points` argument.
    let polygon: Array<[number, number]> | null = null;
    for (const ch of children) {
      if (ch.kind === 'call' && ch.name === 'polygon') {
        const pargs = this.resolveArgs(ch.args, frame);
        const ptsRaw = pargs.named.get('points') ?? pargs.positional[0];
        if (Array.isArray(ptsRaw)) {
          polygon = (ptsRaw as unknown[]).map(p => {
            const v = asVec3(p);
            return [v[0], v[1]] as [number, number];
          });
          break;
        }
      }
    }
    if (!polygon || polygon.length < 3) return;
    this.out.push({
      type: 'extrude', polygon, height,
      position: xform.translate, rotation: xform.rotateDeg, scale: xform.scale,
      color: xform.color ?? this.pickColor(), label: this.makeLabel(), subtractive,
    });
  }

  // ── Argument & expression evaluation ───────────────────────────────────
  private resolveArgs(args: CallArg[], frame: Frame): ResolvedArgs {
    const positional: unknown[] = [];
    const named = new Map<string, unknown>();
    for (const a of args) {
      const v = this.evalExpr(a.value, frame);
      if (a.name) named.set(a.name, v);
      else positional.push(v);
    }
    return { positional, named };
  }

  private evalRange(e: Expr, frame: Frame): number[] {
    const v = this.evalExpr(e, frame);
    if (Array.isArray(v)) return (v as unknown[]).map(asNum);
    if (typeof v === 'number') return [v];
    return [];
  }

  private evalExpr(e: Expr, frame: Frame): unknown {
    switch (e.kind) {
      case 'num': return e.value;
      case 'str': return e.value;
      case 'vec': return e.items.map(i => this.evalExpr(i, frame));
      case 'ident': {
        const v = lookup(frame, e.name);
        if (v !== undefined) return v;
        // OpenSCAD constants
        if (e.name === 'PI') return Math.PI;
        if (e.name === 'true') return true;
        if (e.name === 'false') return false;
        if (e.name === 'undef') return undefined;
        return 0;
      }
      case 'neg': return -asNum(this.evalExpr(e.expr, frame));
      case 'not': return !this.evalExpr(e.expr, frame);
      case 'cond': return this.evalExpr(e.c, frame) ? this.evalExpr(e.t, frame) : this.evalExpr(e.f, frame);
      case 'bin': {
        if (e.op === 'call') {
          // function-style call inside an expression
          const id = (e.a as Extract<Expr, { kind: 'ident' }>).name;
          const argv = (e.b as Extract<Expr, { kind: 'vec' }>).items.map(i => this.evalExpr(i, frame));
          return this.applyFunction(id, argv);
        }
        const a = this.evalExpr(e.a, frame);
        const b = this.evalExpr(e.b, frame);
        const an = asNum(a), bn = asNum(b);
        switch (e.op) {
          case '+': return an + bn;
          case '-': return an - bn;
          case '*': return an * bn;
          case '/': return an / bn;
          case '%': return an % bn;
          case '<': return an < bn;
          case '>': return an > bn;
          case '<=': return an <= bn;
          case '>=': return an >= bn;
          case '==': return a === b;
          case '!=': return a !== b;
          case '&&': return !!a && !!b;
          case '||': return !!a || !!b;
        }
        return 0;
      }
    }
  }

  private applyFunction(name: string, argv: unknown[]): unknown {
    const n = (i: number) => asNum(argv[i]);
    switch (name) {
      case 'sin':  return Math.sin(n(0) * Math.PI / 180);
      case 'cos':  return Math.cos(n(0) * Math.PI / 180);
      case 'tan':  return Math.tan(n(0) * Math.PI / 180);
      case 'abs':  return Math.abs(n(0));
      case 'sqrt': return Math.sqrt(n(0));
      case 'pow':  return Math.pow(n(0), n(1));
      case 'min':  return Math.min(...argv.map(asNum));
      case 'max':  return Math.max(...argv.map(asNum));
      case 'floor': return Math.floor(n(0));
      case 'ceil':  return Math.ceil(n(0));
      case 'round': return Math.round(n(0));
      case 'len':  return Array.isArray(argv[0]) ? (argv[0] as unknown[]).length : 0;
    }
    return 0;
  }

  private pickColor(): string {
    return this.partColors[this.labelCounter % this.partColors.length];
  }
  private makeLabel(): string {
    this.labelCounter++;
    return this.currentLabel || `part_${this.labelCounter}`;
  }
}

interface ResolvedArgs { positional: unknown[]; named: Map<string, unknown>; }

// ── Public API ────────────────────────────────────────────────────────────
/**
 * Parse + evaluate OpenSCAD source. Throws ParseError on tokenization /
 * syntax failure; the caller (App.tsx) should catch and fall back to the
 * legacy regex parser.
 */
export function evaluateOpenSCAD(src: string): EvaluatedPrimitive[] {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  const program = parser.parseProgram();
  const evaluator = new Evaluator();
  return evaluator.run(program);
}
