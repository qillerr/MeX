Goal: Replace MeX v1’s rewrite engine with a precedence-aware compiler pipeline (Lexer → Parser → Emitter) to eliminate scope/precedence bugs and simplify code while preserving core syntax/value.

0. Success Criteria

The v2 engine must:

Parse with correct precedence/associativity for arithmetic, scripts, grouping, and implicit multiplication.

Fix denominator grouping bug: (sth)/xy must emit a single fraction with denominator xy (not x then trailing y).

Preserve existing “range modes” (l{{...}}l, t{{...}}t, m{{...}}m) via lexer mode tokens (single token each).

Support Greek + common functions + sqrt (including indexed sqrt).

Produce deterministic LaTeX output with stable bracing/wrapping rules.

Provide minimal, actionable errors with spans.

Maintain MexTranspiler.transpile(text) API and LRU caching.

Non-goals (v2): implement v1’s broken l** ... **l, trigger/backslash escape system, and full comment semantics beyond “ignore”.

---

1. Architecture & Stage Contracts
   Stage A — Lexer

Input: raw UTF-16 JS string text
Output: Token[], ending with EOF

Hard contract:

Single-pass left-to-right scanner (no iterative “split until stable” loops).

No AST/children/out/mode fields in tokens.

Tokens carry span: { start, end } (indices in original string).

Whitespace is either ignored or tokenized; agent must follow the spec below.

Stage B — Parser (Pratt parser)

Input: Token[]
Output: Expr AST

Hard contract:

Precedence-aware parse producing a tree. No token-sequence pattern rewriting.

Must support implicit multiplication (adjacent atoms).

Must implement scripts ^, \_, and \_\_ as postfix binders forming a Script node.

Must parse grouping tokens into Group nodes.

Parser errors must include a span and message; error recovery is optional.

Stage C — Emitter

Input: AST Expr
Output: LaTeX string

Hard contract:

Pure function (no mutation, no global state).

Uses precedence metadata to add braces/parentheses minimally but correctly.

Greek letters and “symbol keywords” emit as \name (with a trailing space when needed).

Stage D — Cache

Keep current LRU cache behavior:

max size default 256

key = input text (options can be added later)

2. Data Models
   2.1 Token Model
   type TokenType =
   | 'NUMBER' | 'IDENT'
   | 'OP'
   | 'LPAREN' | 'RPAREN'
   | 'LBRACK' | 'RBRACK'
   | 'LBRACE' | 'RBRACE'
   | 'COMMA'
   | 'RAW_LATEX' | 'TEXT' | 'MATHIT'
   | 'NEWLINE'
   | 'EOF';

type Token = {
type: TokenType;
value: string;
span: { start: number; end: number };
};

2.2 AST Model
type Expr =
| { kind: 'Number', value: string }
| { kind: 'Ident', name: string }
| { kind: 'RawLatex', value: string }
| { kind: 'Text', value: string } // corresponds to t{{...}}t
| { kind: 'Mathit', value: string } // corresponds to m{{...}}m
| { kind: 'Group', delim: '()'|'[]'|'{}', expr: Expr }
| { kind: 'Unary', op: '-', expr: Expr }
| { kind: 'Binary', op: '+'|'-'|'\*'|'/'|'=', left: Expr, right: Expr, implicit?: boolean }
| { kind: 'Script', base: Expr, sub?: Expr, sup?: Expr }
| { kind: 'Call', name: string, arg: Expr } // sin(x), cos(x), ln(x), etc.
| { kind: 'Sqrt', index?: Expr, radicand: Expr }; // sqrt(x), sqrt[3](x)

Notes:

Use Binary{implicit:true} for implicit multiplication (adjacency). Operator is '\*' but marked implicit.

Sqrt may be produced by parsing rules OR by emitter-special-case on Call('sqrt', ...). Prefer parse-time Sqrt for clarity.

3. Supported Syntax (v2)

4. Supported Syntax (v2)
   3.1 Literals and identifiers

Numbers: -?\d+(\.\d\*(\(\d+\))?)? (keep v1 regex). Parser treats leading - as unary when separate token; lexer should NOT include - in NUMBER unless it’s part of literal with no whitespace? (see 3.6).

Identifiers: [A-Za-z_]\w\* or \w+ (agent chooses, but must preserve Greek keywords and function names).

Single characters (v1 \w) are now grouped into IDENT tokens (simplification).

3.2 Grouping

(...), [...], {...} become Group.

Emitter must output the same delimiters unless used purely for precedence suppression (see wrapping rules).

3.3 Operators

Support these operators at minimum:

- - - / =

^ \_ \_\_ as scripts

Other v1 operators can be added later; do not block MVP on them.

3.4 Implicit multiplication

Adjacency of “atoms” implies multiplication:
Examples: 2x, xy, (a)b, x(sin(y)), \alpha x, x\alpha.

Atom-start tokens: NUMBER, IDENT, RAW_LATEX, TEXT, MATHIT, any opening delimiter LPAREN/LBRACK/LBRACE.

3.5 Functions

Recognize identifiers as functions when immediately followed by a group (...):

sin(x), cos(x), tan(x), cot(x), ln(x)
Represent as Call(name, arg).

3.6 Unary minus policy

If - occurs in a position where an expression can start (prefix position), parse it as Unary('-', expr).

If you keep NUMBER regex with leading -, lexer MUST NOT swallow - into NUMBER when it would conflict with unary parsing. Recommended: lex - as OP always; number is unsigned. This simplifies everything. (Preferred requirement.)

Acceptance tests assume unary minus works: -x^2 should emit -x^{2} (i.e., unary minus applies to the whole x^2).

3.7 Sqrt and indexed sqrt

Two forms:

sqrt(x) → \sqrt{...}

sqrt[3](x) → \sqrt[3]{...}

Parser should recognize:

IDENT sqrt

optional bracket group [...] for index

required paren group (...) for radicand

3.8 Range modes / passthrough (lexer mode tokens)

Lexer must detect and tokenize as single units:

l{{ ... }}l → RAW_LATEX with inner content

t{{ ... }}t → TEXT with inner content (emits \text{...})

m{{ ... }}m → MATHIT with inner content (emits \mathit{...} or \m{...}; see emitter mapping)

These sequences are not nestable in MVP. The first closing delimiter ends the range.

4. Precedence & Associativity (must implement exactly)

Binding powers (higher binds tighter):

Scripts ^, \_, \_\_: postfix, strongest (bind to immediate base).

Function call (sin(...), sqrt(...)): high.

Unary minus: binds lower than scripts, higher than multiplication.

Implicit multiplication: higher than explicit \* and / (math-style).

Explicit \* and /: left-associative.

- and -: left-associative.

=: left-associative (or non-associative; MVP can treat left-assoc).

Critical requirement: implicit multiplication precedence > / so:

(sth)/xy parses as Binary('/', Group(sth), Binary('\*'(implicit), x, y))

1/xy parses as 1/(x\*y)

Script argument consumption rule

^ and \_ consume one atom unless explicitly grouped:

x^2y = (x^2) \* y (not x^(2y))
x^(2y) = x^{2y}

5. Emission Rules (deterministic)
   5.1 Identifier emission

Greek and symbol keywords map to LaTeX commands: alpha -> \alpha

Function identifiers emit as commands when used in Call: sin(x) → \sin(x) or \sin\left(x\right) (MVP: \sin( + arg + )).

Normal identifiers emit raw: x, foo.

5.2 Operators

Binary('+'): A+B with spaces optional; must be deterministic.

Binary('\*', implicit:true): emit adjacency (no \cdot) by default.

Binary('_', implicit:false): emit \cdot or _ (choose one; spec recommends \cdot for readability).

Binary('/'): MUST emit as fraction: \frac{A}{B} (not inline /).

5.3 Sqrt

Sqrt(index?, radicand):

no index: \sqrt{rad}

with index: \sqrt[index]{rad}

5.4 Script emission

Script(base, sub?, sup?):

base emitted with wrapping if base is not an atom (wrap with {...} when necessary).

sub emits as \_{...}

sup emits as ^{...}

order is always \_ then ^ or preserve both; MUST output both if present.

5.5 Wrapping / bracing rules

For \frac{...}{...} always wrap numerator and denominator with braces (LaTeX standard).

For exponent/subscript contents always use braces {...}.

For binary operators, wrap child expressions in parentheses/braces when child precedence is lower than parent.

Group nodes must emit delimiters exactly (MVP). Later optimization can drop redundant parentheses; not required.

5.6 TEXT and MATHIT

Text(value) → \text{value}

Mathit(value) → \mathit{value}

RawLatex(value) → emit value as-is (no escaping).

6. Error Handling Requirements

Lexer errors: if unknown character is encountered, emit an IDENT of that char OR throw MexError. MVP may be permissive; must not crash silently.

Parser errors must throw:

type MexError = { message: string; span: {start:number; end:number} };

Examples:

unmatched closing paren

unexpected token
missing radicand for sqrt

7. Acceptance Tests (must pass)
   Fractions / precedence

Input: (sth)/xy
Output: \frac{(sth)}{xy} or \frac{sth}{xy} (either acceptable if emitter drops redundant parentheses; choose one and be consistent)

Input: a/b+c
Output: \frac{a}{b}+c

Input: a/(b+c)
Output: \frac{a}{(b+c)} or \frac{a}{b+c} (consistent policy)

Input: 1/xy
Output: \frac{1}{xy}

Scripts

Input: x^2*3
Output: x*{3}^{2} or x^{2}\_{3} (choose one canonical ordering; must be consistent)

Input: x_3^2
Output: identical to test #5 canonical form.

Input: x^2y
Output: x^{2}y (i.e., (x^2) \* y, adjacency)

Sqrt

Input: sqrt(x)
Output: \sqrt{x}

Input: sqrt[3](x)
Output: \sqrt[3]{x}

Range passthrough

Input: l{{\LaTeX}}l + 1
Output: \LaTeX+1 (or with spaces; deterministic)

Input: t{{hello}}t
Output: \text{hello}

Input: m{{x+1}}m
Output: \mathit{x+1} (no further parsing inside; it’s literal content)

8. Implementation Constraints / Guidance for Agents
   File structure (minimum)

src/lexer.js

src/parser.js

src/emitter.js

src/index.js exporting MexTranspiler compatible API

src/cache.js (reuse existing CacheMap with minor polish)

Compatibility

Keep module.exports.MexTranspiler = class MexTranspiler { transpile(text) {} }

Keep cache semantics; may expand key to include options later.

Performance expectations

O(n) lexing

O(n) parsing for typical expressions

No “while(didSomething)” loops over whole input.

Preset migration

Replace Separators + Patterns with:

KEYWORDS_GREEK map { alpha: '\\alpha', ... }

KEYWORDS_SYMBOLS map for geq, leq, etc. (optional for MVP)

FUNCTIONS set { sin, cos, tan, cot, ln, sqrt }

OPERATORS list with multi-char operators recognized by lexer (optional MVP)

RANGE_DELIMS for l{{ }} etc.

9. Deliverables

Working transpiler with the acceptance tests above.

Unit tests:

lexer tokenization tests (spans, range tokens)

parser AST shape tests for precedence

emitter snapshot tests for LaTeX output

Short developer README:

supported syntax

examples

how to run tests

10. Open Decisions (agent must document chosen option)

These are acceptable forks, but must be consistent and tested:

Script canonical order: emit _ then ^ or ^ then _ (choose one).

Explicit _ emission: \cdot vs _ (recommend \cdot).

Whitespace handling in output (spaces around operators): can be minimal; must be deterministic.

If you want, I can also provide an “agent task breakdown” (3–5 parallel tickets: Lexer, Parser, Emitter, Tests, Preset maps) so multiple AI agents can implement concurrently without stepping on each other.
