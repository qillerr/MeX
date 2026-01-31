const { MexError } = require('./errors');
const { TokenType } = require('./lexer');
const { FUNCTIONS, FUNCTION_ALIASES, KEYWORD_OPERATORS, PREFIX_OPERATORS } = require('./keywords');

// Binding powers
const BP = {
  NONE: 0,
  EQUALS: 10,
  ADDITIVE: 20,      // + -
  MULTIPLICATIVE: 30, // * /
  IMPLICIT_MUL: 40,   // Implicit multiplication (higher than explicit!)
  UNARY: 50,          // Unary -
  CALL: 60,           // Function calls
  SCRIPT: 70,         // ^ _ __
};

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    if (this.current().type === TokenType.EOF) {
      // Empty input
      return null;
    }
    const expr = this.parseSequence(BP.NONE);
    if (this.current().type !== TokenType.EOF && this.current().type !== TokenType.NEWLINE) {
      throw new MexError(`Unexpected token: ${this.current().value}`, this.current().span);
    }
    return expr;
  }

  current() {
    return this.tokens[this.pos];
  }

  advance() {
    const token = this.tokens[this.pos];
    if (token.type !== TokenType.EOF) {
      this.pos++;
    }
    return token;
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    if (idx < this.tokens.length) {
      return this.tokens[idx];
    }
    return this.tokens[this.tokens.length - 1]; // EOF
  }

  expect(type, message) {
    if (this.current().type !== type) {
      throw new MexError(message || `Expected ${type}, got ${this.current().type}`, this.current().span);
    }
    return this.advance();
  }

  parseExpr(minBp, stopCtx = null) {
    let left = this.parseAtom();
    if (left === null) {
      return null;
    }

    while (true) {
      const token = this.current();

      // Check stop context (e.g. stopping at > for inner product)
      if (stopCtx && stopCtx(token)) {
        break;
      }

      // Check for postfix operators (scripts)
      if (token.type === TokenType.OP && (token.value === '^' || token.value === '_' || token.value === '__')) {
        if (BP.SCRIPT >= minBp) {
          left = this.parseScript(left);
          continue;
        }
        break;
      }

      // Check for infix operators
      const infixBp = this.getInfixBp(token);
      if (infixBp !== null && infixBp.left >= minBp) {
        left = this.parseInfix(left, infixBp.right, stopCtx);
        continue;
      }

      // Check for implicit multiplication
      if (this.canStartAtom() && BP.IMPLICIT_MUL >= minBp) {
        const right = this.parseExpr(BP.IMPLICIT_MUL + 1, stopCtx);
        left = { kind: 'Binary', op: '*', left, right, implicit: true };
        continue;
      }

      break;
    }

    return left;
  }

  parseAtom() {
    const token = this.current();

    // Skip newlines in atom position
    while (this.current().type === TokenType.NEWLINE) {
      this.advance();
    }

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return { kind: 'Number', value: token.value };

      case TokenType.IDENT:
        return this.parseIdentOrCall();

      case TokenType.RAW_LATEX:
        this.advance();
        return { kind: 'RawLatex', value: token.value };

      case TokenType.TEXT:
        this.advance();
        return { kind: 'Text', value: token.value };

      case TokenType.MATHIT:
        this.advance();
        return { kind: 'Mathit', value: token.value };

      case TokenType.LPAREN:
        return this.parseGroup('()');

      case TokenType.LBRACK:
        return this.parseGroup('[]');

      case TokenType.LBRACE:
        return this.parseGroup('{}');

      case TokenType.LNORM:
        return this.parseGroup('||||');

      case TokenType.OP:
        if (token.value === '<') {
           // Check if it's an inner product: <u, v>
           // Only if we are in atom position.
           return this.parseGroup('<>');
        }
        if (token.value === '-') {
          this.advance();
          const expr = this.parseExpr(BP.UNARY);
          return { kind: 'Unary', op: '-', expr };
        }
        if (token.value === '+') {
          // Unary plus - just skip it
          this.advance();
          return this.parseExpr(BP.UNARY);
        }
        // Other operators in atom position - might be symbol operators
        return this.parseSymbolOp();

      case TokenType.EOF:
        return null;

      default:
        throw new MexError(`Unexpected token in atom position: ${token.type}`, token.span);
    }
  }

  parseIdentOrCall() {
    const token = this.advance(); // IDENT
    let name = token.value;

    // Check for prefix operators (not, forall, exists, nabla)
    if (PREFIX_OPERATORS[name]) {
      const expr = this.parseExpr(BP.UNARY);
      return { kind: 'Unary', op: name, expr };
    }

    // Check for function alias
    if (FUNCTION_ALIASES[name]) {
      name = FUNCTION_ALIASES[name];
    }

    // Special case: sqrt with optional index
    if (name === 'sqrt') {
      return this.parseSqrt();
    }

    // Function call: IDENT followed by LPAREN
    if (FUNCTIONS.has(name) && this.current().type === TokenType.LPAREN) {
      this.advance(); // consume LPAREN

      const args = [];

      // Handle empty args
      if (this.current().type === TokenType.RPAREN) {
        this.advance();
        return { kind: 'Call', name, args: [] };
      }

      // Parse first argument
      args.push(this.parseExpr(BP.NONE));

      // Parse remaining arguments (comma-separated)
      while (this.current().type === TokenType.COMMA) {
        this.advance(); // consume COMMA
        args.push(this.parseExpr(BP.NONE));
      }

      this.expect(TokenType.RPAREN);

      return { kind: 'Call', name, args };
    }

    // Plain identifier
    return { kind: 'Ident', name: token.value };
  }

  parseSqrt() {
    let index = null;

    // Optional index: sqrt[n](x)
    if (this.current().type === TokenType.LBRACK) {
      const indexGroup = this.parseGroup('[]');
      index = indexGroup.expr;
    }

    // Required radicand: sqrt(x)
    if (this.current().type !== TokenType.LPAREN) {
      throw new MexError('sqrt requires parentheses for radicand', this.current().span);
    }
    const radicandGroup = this.parseGroup('()');

    return { kind: 'Sqrt', index, radicand: radicandGroup.expr };
  }

  parseGroup(delim) {
    const openToken = this.advance();
    const closeType = delim === '()' ? TokenType.RPAREN :
                      delim === '[]' ? TokenType.RBRACK :
                      delim === '||||' ? TokenType.RNORM : 
                      delim === '<>' ? TokenType.OP : // > is an OP
                      TokenType.RBRACE;
    
    // Special check for > since it's an OP
    if (delim === '<>') {
        // We expect closeType to be OP and value to be '>'
        // Handle logic inside check below
    }

    // Handle empty groups
    if (this.current().type === closeType) {
      this.advance();
      return { kind: 'Group', delim, expr: null };
    }

    // For brackets and inner products, allowing sequences (comma-separated updates)
    // Parentheses are tricky because (a,b) could be vector or function args? 
    // Usually (a+b) is Group. (a,b) is not standard math grouping except specifically vectors/points.
    
    // Using parseSequence instead of parseExpr allows comma-separated values in groups.
    // e.g. [a, b], <u, v>
    
    // For parens, we usually want (a+b). If we allow (a,b), it becomes a Sequence in a Group.
    
    // Pass stop context if we are in an angle bracket group
    const stopCtx = delim === '<>' ? 
        (t) => t.type === TokenType.OP && t.value === '>' : 
        null;

    const expr = this.parseSequence(BP.NONE, stopCtx);

    // Check for closing token
    let match = false;
    if (delim === '<>') {
        match = this.current().type === TokenType.OP && this.current().value === '>';
    } else {
        match = this.current().type === closeType;
    }

    if (!match) {
      const expected = delim === '()' ? ')' :
                      delim === '[]' ? ']' :
                      delim === '||||' ? '||' : 
                      delim === '<>' ? '>' : '}';
      throw new MexError(`Expected closing '${expected}'`, this.current().span);
    }
    this.advance();

    return { kind: 'Group', delim, expr };
  }

  parseSequence(minBp, stopCtx = null) {
    const first = this.parseExpr(minBp, stopCtx);
    if (first === null) return null;

    if (this.current().type === TokenType.COMMA) {
       const items = [first];
       while (this.current().type === TokenType.COMMA) {
         this.advance();
         const next = this.parseExpr(minBp, stopCtx);
         if (next) items.push(next);
       }
       return { kind: 'Sequence', items };
    }
    
    return first;
  }

  parseScript(base) {
    let sub = null;
    let sup = null;

    // Parse scripts until we don't see any more
    while (this.current().type === TokenType.OP) {
      const op = this.current().value;

      if (op === '^' && sup === null) {
        this.advance();
        sup = this.parseScriptArg();
      } else if (op === '_' && sub === null) {
        this.advance();
        sub = this.parseScriptArg();
      } else if (op === '__' && sub === null) {
        this.advance();
        const inner = this.parseScriptArg();
        // Double subscript: mark with isDoubleScript flag
        sub = { kind: 'Script', base: inner, sub: null, sup: null, isDoubleScript: true };
      } else {
        break;
      }
    }

    return { kind: 'Script', base, sub, sup };
  }

  parseScriptArg() {
    // Scripts consume a single atom, not a full expression
    const token = this.current();

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return { kind: 'Number', value: token.value };

      case TokenType.IDENT:
        return this.parseIdentOrCall();

      case TokenType.LPAREN:
        return this.parseGroup('()');

      case TokenType.LBRACK:
        return this.parseGroup('[]');

      case TokenType.LBRACE:
        return this.parseGroup('{}');

      case TokenType.OP:
        // Check for unary minus: -x, -1, -(x)
        if (token.value === '-' && 
            (this.peek(1).type === TokenType.NUMBER || 
             this.peek(1).type === TokenType.IDENT || 
             this.peek(1).type === TokenType.LPAREN)) {
          this.advance();
          const expr = this.parseScriptArg();
          return { kind: 'Unary', op: '-', expr };
        }

        // Handle raw symbols like + or - in limits: a^+, a^-
        if (token.value === '+' || token.value === '-') {
           this.advance();
           return { kind: 'RawLatex', value: token.value };
        }

        throw new MexError(`Unexpected operator in script: ${token.value}`, token.span);

      default:
        throw new MexError(`Expected script argument, got ${token.type}`, token.span);
    }
  }

  parseSymbolOp() {
    const token = this.advance();
    // Treat symbol operators as identifiers for emission
    return { kind: 'Ident', name: token.value };
  }

  parseInfix(left, rightBp, stopCtx) {
    const op = this.advance(); // The operator

    // Skip newlines after operator
    while (this.current().type === TokenType.NEWLINE) {
      this.advance();
    }

    const right = this.parseExpr(rightBp, stopCtx);

    return { kind: 'Binary', op: op.value, left, right, implicit: false };
  }

  getInfixBp(token) {
    if (token.type === TokenType.OP) {
      switch (token.value) {
        case '=':
        case '!=':
          return { left: BP.EQUALS, right: BP.EQUALS + 1 };
        case '+':
        case '-':
          return { left: BP.ADDITIVE, right: BP.ADDITIVE + 1 };
        case '*':
        case '/':
          return { left: BP.MULTIPLICATIVE, right: BP.MULTIPLICATIVE + 1 };
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '<<':
        case '>>':
          case '<=':
        case '>=':
        case '<<':
        case '>>':
        case '|': // Add pipe as infix for Conditional Prob / Set
          return { left: BP.EQUALS, right: BP.EQUALS + 1 };
        default:
          return null;
      }
    }

    // Check for keyword operators (IDENT tokens that act as operators)
    if (token.type === TokenType.IDENT && KEYWORD_OPERATORS[token.value]) {
      return { left: BP.ADDITIVE, right: BP.ADDITIVE + 1 };
    }

    return null;
  }

  canStartAtom() {
    const token = this.current();
    return (
      token.type === TokenType.NUMBER ||
      token.type === TokenType.IDENT ||
      token.type === TokenType.RAW_LATEX ||
      token.type === TokenType.TEXT ||
      token.type === TokenType.MATHIT ||
      token.type === TokenType.LPAREN ||
      token.type === TokenType.LBRACK ||
      token.type === TokenType.LBRACE
    );
  }
}

module.exports = { Parser, BP };
