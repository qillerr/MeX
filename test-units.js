const { Lexer, TokenType, Parser, MexError } = require('./main.js');
const { astEquals, assertError } = require('./test-utils.js');

console.log('============ RUNNING UNIT TESTS ============\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(`   ${e.message}`);
    // If e has expected and actual properties (custom error), log them
    if (e.actual) console.error('Actual:', JSON.stringify(e.actual, null, 2));
    if (e.expected) console.error('Expected:', JSON.stringify(e.expected, null, 2));
    failed++;
  }
}

// ============ LEXER TESTS ============
console.log('--- Lexer Tests ---');

runTest('Lexer: Basic tokens', () => {
  const lexer = new Lexer('x + 1');
  const tokens = lexer.tokenize();
  
  if (tokens.length !== 4) throw new Error(`Expected 4 tokens, got ${tokens.length}`);
  if (tokens[0].type !== TokenType.IDENT || tokens[0].value !== 'x') throw new Error('Expected IDENT x');
  if (tokens[1].type !== TokenType.OP || tokens[1].value !== '+') throw new Error('Expected OP +');
  if (tokens[2].type !== TokenType.NUMBER || tokens[2].value !== '1') throw new Error('Expected NUMBER 1');
  if (tokens[3].type !== TokenType.EOF) throw new Error('Expected EOF');
});

runTest('Lexer: Range modes (l{{...}}l)', () => {
  const lexer = new Lexer('l{{\\LaTeX}}l');
  const tokens = lexer.tokenize();
  
  if (tokens[0].type !== TokenType.RAW_LATEX) throw new Error('Expected RAW_LATEX context');
  if (tokens[0].value !== '\\LaTeX') throw new Error('Expected value \\LaTeX');
});

runTest('Lexer: Text modes (t{{...}}t)', () => {
  const lexer = new Lexer('t{{hello}}t');
  const tokens = lexer.tokenize();
  
  if (tokens[0].type !== TokenType.TEXT) throw new Error('Expected TEXT token');
  if (tokens[0].value !== 'hello') throw new Error('Expected value hello');
});

runTest('Lexer: Implicit multiplication tokens', () => {
  const lexer = new Lexer('2x');
  const tokens = lexer.tokenize();
  
  if (tokens[0].type !== TokenType.NUMBER) throw new Error('Expected NUMBER');
  if (tokens[1].type !== TokenType.IDENT) throw new Error('Expected IDENT');
});

// ============ PARSER TESTS ============
console.log('\n--- Parser Tests ---');

runTest('Parser: Operator Precedence (Explicit)', () => {
  // a + b * c -> a + (b * c)
  const parser = new Parser(new Lexer('a + b * c').tokenize());
  const ast = parser.parse();
  
  const expected = {
        kind: 'Binary', op: '+', implicit: false,
        left: { kind: 'Ident', name: 'a' },
        right: {
            kind: 'Binary', op: '*', implicit: false,
            left: { kind: 'Ident', name: 'b' },
            right: { kind: 'Ident', name: 'c' }
        }
  };
  
  if (!astEquals(ast, expected)) {
      const err = new Error('AST mismatch for a + b * c');
      err.actual = ast;
      err.expected = expected;
      throw err;
  }
});

runTest('Parser: Implicit Multiplication Precedence', () => {
  // 1/2x -> 1/(2*x)  (Implicit mult > Division)
  const parser = new Parser(new Lexer('1/2x').tokenize());
  const ast = parser.parse();
  
  const expected = {
    kind: 'Binary', op: '/', implicit: false,
    left: { kind: 'Number', value: '1' },
    right: {
        kind: 'Binary', op: '*', implicit: true,
        left: { kind: 'Number', value: '2' },
        right: { kind: 'Ident', name: 'x' }
    }
  };
  
  if (!astEquals(ast, expected)) {
      const err = new Error('AST mismatch for 1/2x');
      err.actual = ast;
      err.expected = expected;
      throw err;
  }
});

runTest('Parser: Implicit vs Explicit Mult', () => {
  // a/b*c -> (a/b)*c  (Explicit * is same level as /)
  const parser = new Parser(new Lexer('a/b*c').tokenize());
  const ast = parser.parse();
  
  const expected = {
    kind: 'Binary', op: '*', implicit: false,
    left: {
        kind: 'Binary', op: '/', implicit: false,
        left: { kind: 'Ident', name: 'a' },
        right: { kind: 'Ident', name: 'b' }
    },
    right: { kind: 'Ident', name: 'c' }
  };
  
  if (!astEquals(ast, expected)) {
      const err = new Error('AST mismatch for a/b*c');
      err.actual = ast;
      err.expected = expected;
      throw err;
  }
});

runTest('Parser: Scripts associativity', () => {
  // x^2_3 -> x (script ^2 (_3??)) - Wait, spec says canonical order.
  // Code parses scripts in loop.
  // base=x. Loop op=^ -> sup=2. Loop op=_ -> sub=3.
  const parser = new Parser(new Lexer('x^2_3').tokenize());
  const ast = parser.parse();
  
  if (ast.kind !== 'Script') throw new Error('Expected Script node');
  if (ast.sup.value !== '2') throw new Error('Expected sup 2');
  if (ast.sub.value !== '3') throw new Error('Expected sub 3');
});

runTest('Parser: Complex scripts', () => {
    // x^2y -> (x^2) * y
  const parser = new Parser(new Lexer('x^2y').tokenize());
  const ast = parser.parse();
  
  const expected = {
      kind: 'Binary', op: '*', implicit: true,
      left: {
          kind: 'Script',
          base: { kind: 'Ident', name: 'x' },
          sup: { kind: 'Number', value: '2' },
          sub: null
      },
      right: { kind: 'Ident', name: 'y' }
  };
   if (!astEquals(ast, expected)) throw new Error('AST mismatch for x^2y');
});

runTest('Parser: Inner Product', () => {
  const parser = new Parser(new Lexer('<u, v>').tokenize());
  const ast = parser.parse();
  
  if (ast.kind !== 'Group' || ast.delim !== '<>') throw new Error('Expected Group <>');
  if (ast.expr.kind !== 'Sequence') throw new Error('Expected Sequence content');
  if (ast.expr.items.length !== 2) throw new Error('Expected 2 items');
});

runTest('Parser: Top-level Sequence', () => {
    const parser = new Parser(new Lexer('a, b').tokenize());
    const ast = parser.parse();
    
    if (ast.kind !== 'Sequence') throw new Error('Expected Sequence');
    if (ast.expr) throw new Error('Sequence is not a wrapper'); // Sequence has items, not expr
    if (ast.items.length !== 2) throw new Error('Expected 2 items');
});

// ============ ERROR TESTS ============
console.log('\n--- Error Tests ---');

runTest('Error: Unmatched Parenthesis', () => {
  assertError(() => {
     const parser = new Parser(new Lexer('(a').tokenize());
     parser.parse();
  }, "Expected closing ')'");
});

runTest('Error: Unclosed Range Mode', () => {
  assertError(() => {
    const lexer = new Lexer('l{{ latex');
    lexer.tokenize();
  }, "Unclosed range mode");
});

runTest('Error: Invalid operator in script', () => {
  assertError(() => {
     const parser = new Parser(new Lexer('x^*').tokenize());
     parser.parse();
  }, "Unexpected operator in script");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
