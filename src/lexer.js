const { MexError } = require('./errors');
const { MULTI_CHAR_OPS } = require('./keywords');

const TokenType = {
  NUMBER: 'NUMBER',
  IDENT: 'IDENT',
  OP: 'OP',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACK: 'LBRACK',
  RBRACK: 'RBRACK',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  LNORM: 'LNORM',    // Opening ||
  RNORM: 'RNORM',    // Closing ||
  COMMA: 'COMMA',
  RAW_LATEX: 'RAW_LATEX',
  TEXT: 'TEXT',
  MATHIT: 'MATHIT',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.source.length) {
      this.scanToken();
    }
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      span: { start: this.pos, end: this.pos },
    });
    return this.tokens;
  }

  scanToken() {
    // Skip whitespace (except newlines)
    if (this.skipWhitespace()) {
      return;
    }

    const start = this.pos;
    const char = this.source[this.pos];

    // Comments: % to end of line
    if (char === '%') {
      this.skipComment();
      return;
    }

    // Newline
    if (char === '\n') {
      this.pos++;
      this.tokens.push({
        type: TokenType.NEWLINE,
        value: '\n',
        span: { start, end: this.pos },
      });
      return;
    }

    // Range modes: l{{...}}l, t{{...}}t, m{{...}}m
    if ((char === 'l' || char === 't' || char === 'm') && this.peek(1) === '{' && this.peek(2) === '{') {
      this.scanRangeMode(char);
      return;
    }

    // Numbers (unsigned)
    if (this.isDigit(char)) {
      this.scanNumber();
      return;
    }

    // Identifiers
    if (this.isAlpha(char)) {
      this.scanIdentifier();
      return;
    }

    // Multi-character operators (check before single-char)
    for (const op of MULTI_CHAR_OPS) {
      if (this.matchString(op)) {
        this.tokens.push({
          type: TokenType.OP,
          value: op,
          span: { start, end: this.pos },
        });
        return;
      }
    }

    // Single-character tokens
    switch (char) {
      case '(':
        this.pos++;
        this.tokens.push({ type: TokenType.LPAREN, value: '(', span: { start, end: this.pos } });
        return;
      case ')':
        this.pos++;
        this.tokens.push({ type: TokenType.RPAREN, value: ')', span: { start, end: this.pos } });
        return;
      case '[':
        this.pos++;
        this.tokens.push({ type: TokenType.LBRACK, value: '[', span: { start, end: this.pos } });
        return;
      case ']':
        this.pos++;
        this.tokens.push({ type: TokenType.RBRACK, value: ']', span: { start, end: this.pos } });
        return;
      case '{':
        this.pos++;
        this.tokens.push({ type: TokenType.LBRACE, value: '{', span: { start, end: this.pos } });
        return;
      case '}':
        this.pos++;
        this.tokens.push({ type: TokenType.RBRACE, value: '}', span: { start, end: this.pos } });
        return;
      case ',':
        this.pos++;
        this.tokens.push({ type: TokenType.COMMA, value: ',', span: { start, end: this.pos } });
        return;
      case '+':
      case '-':
      case '*':
      case '/':
      case '=':
      case '^':
      case '_':
      case '<':
      case '>':
      case '~':
        this.pos++;
        this.tokens.push({ type: TokenType.OP, value: char, span: { start, end: this.pos } });
        return;

      case '|':
        // Check for double pipe ||
        if (this.peek(1) === '|') {
          this.pos += 2; // consume both pipes

          // Determine if opening or closing based on context
          // Opening: after OP, LPAREN, COMMA, or at start
          // Closing: after RPAREN, IDENT, NUMBER, RNORM
          const prevToken = this.tokens[this.tokens.length - 1];
          const isOpening = !prevToken ||
                            prevToken.type === TokenType.OP ||
                            prevToken.type === TokenType.LPAREN ||
                            prevToken.type === TokenType.COMMA;

          this.tokens.push({
            type: isOpening ? TokenType.LNORM : TokenType.RNORM,
            value: '||',
            span: { start, end: this.pos }
          });
          return;
        }

        // Single pipe - treat as operator (for absolute value)
        this.pos++;
        this.tokens.push({ type: TokenType.OP, value: '|', span: { start, end: this.pos } });
        return;
    }

    // Unknown character - emit as single-char IDENT
    this.pos++;
    this.tokens.push({
      type: TokenType.IDENT,
      value: char,
      span: { start, end: this.pos },
    });
  }

  skipWhitespace() {
    let skipped = false;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.pos++;
        skipped = true;
      } else {
        break;
      }
    }
    return skipped && this.pos < this.source.length;
  }

  skipComment() {
    // Skip from % to end of line
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.pos++;
    }
  }

  scanRangeMode(modeChar) {
    const start = this.pos;
    const opening = modeChar + '{{';
    const closing = '}}' + modeChar;

    // Skip opening delimiter
    this.pos += 3;

    // Find closing delimiter
    const contentStart = this.pos;
    while (this.pos < this.source.length) {
      if (this.source.slice(this.pos, this.pos + 3) === closing) {
        const content = this.source.slice(contentStart, this.pos);
        this.pos += 3; // Skip closing delimiter

        let type;
        if (modeChar === 'l') {
          type = TokenType.RAW_LATEX;
        } else if (modeChar === 't') {
          type = TokenType.TEXT;
        } else {
          type = TokenType.MATHIT;
        }

        this.tokens.push({
          type,
          value: content,
          span: { start, end: this.pos },
        });
        return;
      }
      this.pos++;
    }

    // Unclosed range mode
    throw new MexError(`Unclosed range mode: ${opening}`, { start, end: this.pos });
  }

  scanNumber() {
    const start = this.pos;

    // Integer part
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
      this.pos++;
    }

    // Decimal part
    if (this.pos < this.source.length && this.source[this.pos] === '.') {
      this.pos++;
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        this.pos++;
      }

      // Optional repeating decimal: (digits)
      if (this.pos < this.source.length && this.source[this.pos] === '(') {
        const parenStart = this.pos;
        this.pos++;
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          this.pos++;
        }
        if (this.pos < this.source.length && this.source[this.pos] === ')') {
          this.pos++;
        } else {
          // Not a repeating decimal, backtrack
          this.pos = parenStart;
        }
      }
    }

    this.tokens.push({
      type: TokenType.NUMBER,
      value: this.source.slice(start, this.pos),
      span: { start, end: this.pos },
    });
  }

  scanIdentifier() {
    const start = this.pos;

    while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
      this.pos++;
    }

    this.tokens.push({
      type: TokenType.IDENT,
      value: this.source.slice(start, this.pos),
      span: { start, end: this.pos },
    });
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    if (idx < this.source.length) {
      return this.source[idx];
    }
    return null;
  }

  matchString(str) {
    if (this.source.slice(this.pos, this.pos + str.length) === str) {
      this.pos += str.length;
      return true;
    }
    return false;
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  isAlpha(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  isAlphaNumeric(char) {
    return this.isDigit(char) || this.isAlpha(char);
  }
}

module.exports = { Lexer, TokenType };
