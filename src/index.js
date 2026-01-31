const { Lexer, TokenType } = require('./lexer');
const { Parser } = require('./parser');
const { Emitter } = require('./emitter');
const { CacheMap } = require('./cache');
const { MexError } = require('./errors');

class MexTranspiler {
  constructor(options = {}) {
    this.cache = new CacheMap(options.cacheSize || 256);
    this.debug = options.debug || 0;
  }

  log(...args) {
    if (this.debug) {
      console.log(...args);
    }
  }

  transpile(text) {
    // Check cache
    if (this.cache.has(text)) {
      return this.cache.get(text);
    }

    // Stage A: Lexing
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();

    this.log('Tokens:', tokens);

    // Stage B: Parsing
    const parser = new Parser(tokens);
    const ast = parser.parse();

    this.log('AST:', JSON.stringify(ast, null, 2));

    // Stage C: Emitting
    const emitter = new Emitter();
    const latex = emitter.emit(ast);

    this.log('LaTeX:', latex);

    // Cache result
    this.cache.unshift(text, latex);

    return latex;
  }
}

module.exports = {
  MexTranspiler,
  CacheMap,
  MexError,
  Lexer,
  TokenType,
  Parser,
  Emitter,
};
