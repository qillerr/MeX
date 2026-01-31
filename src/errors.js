class MexError extends Error {
  constructor(message, span = null) {
    super(message);
    this.name = 'MexError';
    this.span = span; // { start: number, end: number }
  }

  toString() {
    if (this.span) {
      return `MexError at ${this.span.start}-${this.span.end}: ${this.message}`;
    }
    return `MexError: ${this.message}`;
  }
}

module.exports = { MexError };
