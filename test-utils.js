const { MexError } = require('./main.js');

/**
 * Normalize LaTeX output for semantic comparison
 * Removes formatting differences while preserving semantic meaning
 */
function normalizeLatex(latex) {
  return latex
    .replace(/\s+/g, ' ')              // Collapse all whitespace to single space
    .replace(/\\ ([a-zA-Z]+) /g, '\\$1 ') // Normalize command spacing (e.g., "\alpha " → "\alpha ")
    .replace(/\s*\{\s*/g, '{')         // Remove spaces around braces
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*\(\s*/g, '(')         // Remove spaces around parens
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*\[\s*/g, '[')         // Remove spaces around brackets
    .replace(/\s*\]\s*/g, ']')
    .trim();
}

/**
 * Compare two LaTeX strings semantically
 * Returns true if they represent the same mathematical expression
 */
function latexEquals(actual, expected) {
  return normalizeLatex(actual) === normalizeLatex(expected);
}

/**
 * Check if two spans match (with tolerance for minor differences)
 */
function spanMatches(actual, expected) {
  if (!actual && !expected) return true;
  if (!actual || !expected) return false;

  // Allow 1-character tolerance for start/end positions
  const startMatch = Math.abs(actual.start - expected.start) <= 1;
  const endMatch = Math.abs(actual.end - expected.end) <= 1;

  return startMatch && endMatch;
}

/**
 * Assert that a function throws a MexError with expected properties
 * @param {Function} fn - Function that should throw
 * @param {string} expectedMessage - Substring expected in error message
 * @param {Object} expectedSpan - Optional span {start, end} to validate
 */
function assertError(fn, expectedMessage, expectedSpan = null) {
  try {
    fn();
    throw new Error('Expected MexError to be thrown, but no error was thrown');
  } catch (e) {
    // Re-throw if it's not a MexError
    if (!(e instanceof MexError)) {
      if (e.message === 'Expected MexError to be thrown, but no error was thrown') {
        throw e;
      }
      throw new Error(`Expected MexError, but got ${e.constructor.name}: ${e.message}`);
    }

    // Validate error message
    if (expectedMessage && !e.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to contain "${expectedMessage}", but got: "${e.message}"`
      );
    }

    // Validate span if provided
    if (expectedSpan !== null && !spanMatches(e.span, expectedSpan)) {
      throw new Error(
        `Expected span ${JSON.stringify(expectedSpan)}, but got ${JSON.stringify(e.span)}`
      );
    }

    // Success - error was thrown with correct properties
    return true;
  }
}

/**
 * Deep comparison of AST nodes
 * Ignores implementation-specific properties and focuses on semantic structure
 */
function astEquals(actual, expected) {
  if (actual === null && expected === null) return true;
  if (actual === null || expected === null) return false;

  if (typeof actual !== 'object' || typeof expected !== 'object') {
    return actual === expected;
  }

  // Must have same kind
  if (actual.kind !== expected.kind) return false;

  // Compare based on node kind
  switch (actual.kind) {
    case 'Number':
      return actual.value === expected.value;

    case 'Ident':
      return actual.name === expected.name;

    case 'RawLatex':
    case 'Text':
    case 'Mathit':
      return actual.value === expected.value;

    case 'Group':
      return actual.delim === expected.delim &&
             astEquals(actual.expr, expected.expr);

    case 'Unary':
      return actual.op === expected.op &&
             astEquals(actual.expr, expected.expr);

    case 'Binary':
      return actual.op === expected.op &&
             actual.implicit === expected.implicit &&
             astEquals(actual.left, expected.left) &&
             astEquals(actual.right, expected.right);

    case 'Script':
      return astEquals(actual.base, expected.base) &&
             astEquals(actual.sub, expected.sub) &&
             astEquals(actual.sup, expected.sup) &&
             actual.isDoubleScript === expected.isDoubleScript;

    case 'Call':
      return actual.name === expected.name &&
             astEquals(actual.arg, expected.arg);

    case 'Sqrt':
      return astEquals(actual.radicand, expected.radicand) &&
             astEquals(actual.index, expected.index);

    default:
      throw new Error(`Unknown AST node kind: ${actual.kind}`);
  }
}

module.exports = {
  normalizeLatex,
  latexEquals,
  spanMatches,
  assertError,
  astEquals,
};
