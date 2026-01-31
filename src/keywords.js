// Greek letters - maps identifier to LaTeX command name
const GREEK_LETTERS = {
  // Variants (must come before base forms for lexer matching)
  vartheta: 'vartheta',
  varepsilon: 'varepsilon',
  varpi: 'varpi',
  varsigma: 'varsigma',
  varrho: 'varrho',
  varphi: 'varphi',

  // Lowercase
  alpha: 'alpha',
  beta: 'beta',
  gamma: 'gamma',
  delta: 'delta',
  epsilon: 'epsilon',
  zeta: 'zeta',
  eta: 'eta',
  theta: 'theta',
  iota: 'iota',
  kappa: 'kappa',
  lambda: 'lambda',
  mu: 'mu',
  nu: 'nu',
  xi: 'xi',
  pi: 'pi',
  rho: 'rho',
  sigma: 'sigma',
  tau: 'tau',
  upsilon: 'upsilon',
  phi: 'phi',
  chi: 'chi',
  psi: 'psi',
  omega: 'omega',

  // Uppercase
  Gamma: 'Gamma',
  Delta: 'Delta',
  Theta: 'Theta',
  Lambda: 'Lambda',
  Xi: 'Xi',
  Pi: 'Pi',
  Sigma: 'Sigma',
  Upsilon: 'Upsilon',
  Phi: 'Phi',
  Psi: 'Psi',
  Omega: 'Omega',

  // Aliases
  micro: 'mu',

  // Special math operators
  partial: 'partial',
};

// Functions that should be emitted as \name
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'ln', 'log', 'exp', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'lim', 'int', 'sum', 'prod', 'oint',
  'det', 'gcd',
  'binom', 'floor', 'ceil', 'abs',
  'arg', 'conj',
  'Var', 'Cov', 'Re', 'Im',
  'tr', 'rank',
  'lcm',
  'N',
  'Beta',
]);

// Function aliases (maps alias to canonical name)
const FUNCTION_ALIASES = {
  ctg: 'cot',
  tg: 'tan',
};

// Symbols that map to LaTeX commands
const SYMBOLS = {
  infty: 'infty',
  inf: 'infty',
  pm: 'pm',
  mp: 'mp',
  times: 'times',
  div: 'div',
  cdot: 'cdot',
  leq: 'leq',
  geq: 'geq',
  sim: 'sim',
  ll: 'll',
  gg: 'gg',
  to: 'to',
  // in: 'in',      // Moved to KEYWORD_OPERATORS
  // notin: 'notin', // Moved to KEYWORD_OPERATORS
  land: 'land',
  lor: 'lor',
  dots: 'dots',
  deg: '^{\\circ}',
  emptyset: 'emptyset',
  nabla: 'nabla',

  // Number sets (Blackboard Bold)
  N: 'mathbb{N}',
  Z: 'mathbb{Z}',
  Q: 'mathbb{Q}',
  R: 'mathbb{R}',
  C: 'mathbb{C}',
};

// Keyword-based operators (words that act as operators)
const KEYWORD_OPERATORS = {
  // Logic operators (infix)
  and: 'land',
  or: 'lor',
  implies: 'implies',
  iff: 'iff',

  // Set theory operators (infix)
  in: 'in',
  notin: 'notin',
  union: 'cup',
  intersect: 'cap',
  setminus: 'setminus',
  subset: 'subset',
  subseteq: 'subseteq',

  // Number theory (infix)
  mod: 'bmod',
  equiv: 'equiv',
  approx: 'approx',
  neq: 'neq',

  // Physics operators (for dot and cross products)
  dot: 'cdot',
  cross: 'times',
};

// Prefix keyword operators
const PREFIX_OPERATORS = {
  not: 'neg',
  forall: 'forall',
  exists: 'exists',
  mod: 'pmod',
};

// Functions that should emit with \text{} wrapper
const TEXT_FUNCTIONS = new Set([
  'Var', 'Cov', 'Re', 'Im',
  'tr', 'rank',
  'lcm',
]);

// Multi-character operators (order matters - longer first)
const MULTI_CHAR_OPS = [
  '__',   // Double subscript (must come before _)
  '<<',   // Much less than
  '>>',   // Much greater than
  '~~',   // Approximately
  '!=',   // Not equal
  '>=',   // Greater or equal
  '<=',   // Less or equal
  '->',   // Arrow
  '+-',   // Plus minus
];

module.exports = {
  GREEK_LETTERS,
  FUNCTIONS,
  FUNCTION_ALIASES,
  SYMBOLS,
  MULTI_CHAR_OPS,
  KEYWORD_OPERATORS,
  PREFIX_OPERATORS,
  TEXT_FUNCTIONS,
};
