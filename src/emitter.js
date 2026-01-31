const { GREEK_LETTERS, FUNCTIONS, FUNCTION_ALIASES, SYMBOLS, KEYWORD_OPERATORS, PREFIX_OPERATORS, TEXT_FUNCTIONS } = require('./keywords');
const { MexError } = require('./errors');

// Map function names to special emitter methods
const SPECIAL_FUNCTIONS = {
  int: 'emitIntegral',
  oint: 'emitIntegral',
  lim: 'emitLimit',
  sum: 'emitSum',
  prod: 'emitProduct',
  binom: 'emitBinom',
  floor: 'emitFloor',
  ceil: 'emitCeil',
  abs: 'emitAbs',
  conj: 'emitConj',
  gcd: 'emitGcd',
  det: 'emitDet',
  arg: 'emitArg',
  Beta: 'emitBeta',
};

class Emitter {
  emit(node) {
    if (node === null) {
      return '';
    }

    switch (node.kind) {
      case 'Number':
        return node.value;

      case 'Ident':
        return this.emitIdent(node);

      case 'RawLatex':
        return node.value;

      case 'Text':
        return `\\text{${node.value}}`;

      case 'Mathit':
        return `\\mathit{${node.value}}`;

      case 'Group':
        return this.emitGroup(node);

      case 'Unary':
        return this.emitUnary(node);

      case 'Binary':
        return this.emitBinary(node);

      case 'Script':
        return this.emitScript(node);

      case 'Call':
        return this.emitCall(node);

      case 'Sqrt':
        return this.emitSqrt(node);

      case 'Sqrt':
        return this.emitSqrt(node);

      case 'Sequence':
        return this.emitSequence(node);

      default:
        throw new Error(`Unknown node kind: ${node.kind}`);
    }
  }

  emitIdent(node) {
    const name = node.name;

    // Special case: laplacian expands to nabla^2
    if (name === 'laplacian') {
      return '\\nabla^{2}';
    }

    // Check if it's a Greek letter
    if (GREEK_LETTERS[name]) {
      return `\\${GREEK_LETTERS[name]} `;
    }

    // Check if it's a symbol
    if (SYMBOLS[name]) {
      const latex = SYMBOLS[name];
      // Some symbols like 'deg' have special formatting
      if (latex.startsWith('^') || latex.startsWith('_')) {
        return latex;
      }
      return `\\${latex} `;
    }

    // Check if it's a function used standalone (without parens)
    let funcName = name;
    if (FUNCTION_ALIASES[name]) {
      funcName = FUNCTION_ALIASES[name];
    }
    if (FUNCTIONS.has(funcName)) {
      return `\\${funcName} `;
    }

    // Regular identifier
    return name;
  }

  emitGroup(node) {
    const inner = this.emit(node.expr);

    // Check for pmod special case: (pmod n) -> \pmod{n} (strip surrounding parens)
    if (node.delim === '()' && inner.trim().startsWith('\\pmod')) {
        return inner;
    }

    switch (node.delim) {
      case '()':
        // Check for (mod n) -> \pmod{n}
        if (this.isModulus(node.expr)) {
            return `\\pmod{${this.emit(node.expr.right)}}`;
        }
        return `(${inner})`;
      case '[]':
        // Check for Matrix: [[a,b], [c,d]]
        // Structure: Group([]) -> expr: Sequence([Group([]), Group([])])
        if (node.expr && node.expr.kind === 'Sequence') {
             // Check if all items are Groups with []
             const isMatrix = node.expr.items.every(item => 
                 item.kind === 'Group' && item.delim === '[]');
             
             if (isMatrix) {
                 // Emit matrix content
                 const rows = node.expr.items.map(rowGroup => {
                     // Each row group expr should be Sequence (or single item)
                     const rowContent = rowGroup.expr;
                     // Handled by this.emit(rowContent) which emits sequence as comma separated?
                     // No, matrix needs '&' separator.
                     // We need to re-visit the rowContent AST to emit with '&'.
                     
                     if (!rowContent) return '';
                     
                     if (rowContent.kind === 'Sequence') {
                         return rowContent.items.map(cell => this.emit(cell)).join(' & ');
                     } else {
                         return this.emit(rowContent);
                     }
                 });
                 return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
             }
        }
        return `[${inner}]`;
      case '{}':
        return `\\{${inner}\\}`;
      case '<>':
        return `\\langle ${inner} \\rangle`;
      case '||||':
        return `\\|${inner}\\|`;
      default:
        return inner;
    }
  }

  emitUnary(node) {
    const expr = this.emit(node.expr);

    // Check for prefix operators (not, forall, exists, nabla)
    if (PREFIX_OPERATORS[node.op]) {
      const latexOp = PREFIX_OPERATORS[node.op];
      if (node.op === 'mod') {
          return `\\${latexOp}{${expr}}`;
      }
      return `\\${latexOp} ${expr}`;
    }

    // Default: unary minus
    return `-${expr}`;
  }

  emitBinary(node) {
    const left = this.emit(node.left);
    const right = this.emit(node.right);

    // Check for keyword operators first (and, or, union, etc.)
    // Check for keyword operators
    if (KEYWORD_OPERATORS[node.op]) {
      const latexOp = KEYWORD_OPERATORS[node.op];
      const fullOp = node.op;

      // Operators that need explicit spacing around them:
      // approx, neq, equiv, sim, subset, subseteq, in, notin
      if (['approx', 'neq', 'equiv', 'sim', 'subset', 'subseteq', 'in', 'notin'].includes(fullOp)) {
         return `${left} \\${latexOp} ${right}`;
      }
      
      // Logic operators usually benefit from spacing
      if (['and', 'or', 'implies', 'iff'].includes(fullOp)) {
         return `${left} \\${latexOp} ${right}`;
      }

      // Default for others (like cup, cap, etc - typically binary relation spacing is handled by LaTeX but we add space for source readability)
      return `${left} \\${latexOp} ${right}`;
    }

    switch (node.op) {
      case '/':
        // Strip outer parentheses from denominator only if it contains a nested fraction
        // This fixes continued fractions: 1/(a+1/(b+1/c)) → \frac{1}{a+\frac{1}{b+\frac{1}{c}}}
        // But preserves grouping in cases like a/(b+c)
        let denominatorStr = right;
        if (node.right.kind === 'Group' &&
            node.right.delim === '()' &&
            this.containsFraction(node.right.expr)) {
          denominatorStr = this.emit(node.right.expr);
        }
        return `\\frac{${left}}{${denominatorStr}}`;

      case '*':
        if (node.implicit) {
          // Special case: implicit multiplication with partial derivatives
          // Add space between adjacent \partial operators for readability
          const leftIsPartial = this.containsPartial(node.left);
          const rightIsPartial = node.right.kind === 'Ident' && node.right.name === 'partial';

          if (leftIsPartial && rightIsPartial) {
            return `${left} ${right}`; // Add space between partials
          }

          // Normal implicit multiplication - just adjacency
          return `${left}${right}`;
        }
        // Explicit multiplication → \cdot with spaces
        return `${left} \\cdot ${right}`;

      case '+':
        return `${left}+${right}`;

      case '-':
        return `${left}-${right}`;

      case '=':
        return `${left}=${right}`;

      // Comparison operators
      case '<':
        return `${left}<${right}`;
      case '>':
        return `${left}>${right}`;
      case '<=':
        return `${left} \\leq ${right}`;
      case '>=':
        return `${left} \\geq ${right}`;
      case '<<':
        return `${left} \\ll ${right}`;
      case '>>':
        return `${left} \\gg ${right}`;
      case '!=':
        return `${left} \\neq ${right}`;

      default:
        // For other operators, emit as-is
        return `${left}${node.op}${right}`;
    }
  }

  emitScript(node) {
    // Handle double subscript (from __) - emit as _{base}
    if (node.isDoubleScript) {
      const base = this.emitUnwrapped(node.base);
      return `_{${base}}`;
    }

    let base = this.emit(node.base);

    // IMPORTANT: Trim trailing space from base to fix sin^2 → \sin^{2} (not \sin ^{2})
    // Functions and symbols emit with trailing spaces, but we don't want space before scripts
    base = base.trimEnd();

    // Build script suffix
    let result = base;

    // Subscript first (canonical order)
    if (node.sub !== null) {
      const sub = this.emitUnwrapped(node.sub);
      result += `_{${sub}}`;
    }

    // Then superscript
    if (node.sup !== null) {
      const sup = this.emitUnwrapped(node.sup);
      result += `^{${sup}}`;
    }

    return result;
  }

  // Emit a node, unwrapping parentheses groups (used for script arguments)
  emitUnwrapped(node) {
    if (node.kind === 'Group' && node.delim === '()') {
      return this.emit(node.expr);
    }
    return this.emit(node);
  }

  emitCall(node) {
    // Handle both old format (node.arg) and new format (node.args)
    const args = node.args || [node.arg];

    // Check if this function has a special emitter
    if (SPECIAL_FUNCTIONS[node.name]) {
      const emitterName = SPECIAL_FUNCTIONS[node.name];
      return this[emitterName](node.name, args);
    }

    // Default handling for standard functions
    const argStr = args.map(a => this.emit(a)).join(',');

    // Check if this function should be wrapped in \text{}
    if (TEXT_FUNCTIONS.has(node.name)) {
      return `\\text{${node.name}}(${argStr})`;
    }

    // Check if it's a symbol (e.g. N -> \mathbb{N})
    if (SYMBOLS[node.name]) {
      return `\\${SYMBOLS[node.name]}(${argStr})`;
    }

    return `\\${node.name}(${argStr})`;
  }

  emitSqrt(node) {
    const radicand = this.emit(node.radicand);

    if (node.index !== null) {
      const index = this.emit(node.index);
      return `\\sqrt[${index}]{${radicand}}`;
    }

    return `\\sqrt{${radicand}}`;
  }

  // Special function emitters

  emitIntegral(name, args) {
    const cmd = name === 'oint' ? '\\oint' : '\\int';

    if (args.length === 1) {
      // Single arg: int(expr) - just the integral symbol with expression
      const expr = this.emit(args[0]);
      return `${cmd} ${expr}`;
    } else if (args.length === 2) {
      // int(f(x), dx) → \int f(x) \, dx
      // Second arg is the full differential (e.g., "dx"), emit as-is
      const expr = this.emit(args[0]);
      const differential = this.emit(args[1]);
      return `${cmd} ${expr} \\, ${differential}`;
    } else if (args.length === 4) {
      // int(f(x), x, a, b) → \int_{a}^{b} f(x) \, dx
      // Second arg is just the variable name, prepend 'd'
      const expr = this.emit(args[0]);
      const varName = this.emit(args[1]);
      const lower = this.emit(args[2]);
      const upper = this.emit(args[3]);
      return `${cmd}_{${lower}}^{${upper}} ${expr} \\, d${varName}`;
    }

    throw new MexError(`${name}() requires 1, 2, or 4 arguments, got ${args.length}`);
  }

  emitLimit(name, args) {
    if (args.length !== 3) {
      throw new MexError(`lim() requires 3 arguments, got ${args.length}`);
    }

    const varName = this.emit(args[0]);
    const point = this.emit(args[1]);
    const expr = this.emit(args[2]);

    return `\\lim_{${varName} \\to ${point}} ${expr}`;
  }

  emitSum(name, args) {
    if (args.length !== 4) {
      throw new MexError(`sum() requires 4 arguments, got ${args.length}`);
    }

    const idx = this.emit(args[0]);
    const lower = this.emit(args[1]);
    const upper = this.emit(args[2]);
    const expr = this.emit(args[3]);

    return `\\sum_{${idx}=${lower}}^{${upper}} ${expr}`;
  }

  emitProduct(name, args) {
    if (args.length !== 4) {
      throw new MexError(`prod() requires 4 arguments, got ${args.length}`);
    }

    const idx = this.emit(args[0]);
    const lower = this.emit(args[1]);
    const upper = this.emit(args[2]);
    const expr = this.emit(args[3]);

    return `\\prod_{${idx}=${lower}}^{${upper}} ${expr}`;
  }

  emitBinom(name, args) {
    if (args.length !== 2) {
      throw new MexError(`binom() requires 2 arguments, got ${args.length}`);
    }

    const n = this.emit(args[0]);
    const k = this.emit(args[1]);
    return `\\binom{${n}}{${k}}`;
  }

  emitFloor(name, args) {
    if (args.length !== 1) {
      throw new MexError(`floor() requires 1 argument, got ${args.length}`);
    }

    const x = this.emit(args[0]);
    return `\\lfloor ${x} \\rfloor`;
  }

  emitCeil(name, args) {
    if (args.length !== 1) {
      throw new MexError(`ceil() requires 1 argument, got ${args.length}`);
    }

    const x = this.emit(args[0]);
    return `\\lceil ${x} \\rceil`;
  }

  emitAbs(name, args) {
    if (args.length !== 1) {
      throw new MexError(`abs() requires 1 argument, got ${args.length}`);
    }

    const x = this.emit(args[0]);
    return `|${x}|`;
  }

  emitConj(name, args) {
    if (args.length !== 1) {
      throw new MexError(`conj() requires 1 argument, got ${args.length}`);
    }

    const z = this.emit(args[0]);
    return `\\overline{${z}}`;
  }

  emitGcd(name, args) {
    if (args.length < 2) {
      throw new MexError(`gcd() requires at least 2 arguments, got ${args.length}`);
    }

    const argStr = args.map(a => this.emit(a)).join(',');
    return `\\gcd(${argStr})`;
  }

  emitDet(name, args) {
    if (args.length !== 1) {
      throw new MexError(`det() requires 1 argument, got ${args.length}`);
    }

    const argNode = args[0];
    const arg = this.emit(argNode);
    
    // If arg is a matrix or already grouped, don't add parens
    if (this.isMatrix(argNode) || argNode.kind === 'Group') {
        return `\\det ${arg}`;
    }
    return `\\det(${arg})`;
  }

  emitArg(name, args) {
    if (args.length !== 1) {
      throw new MexError(`arg() requires 1 argument, got ${args.length}`);
    }

    const z = this.emit(args[0]);
    return `\\arg(${z})`;
  }

  emitBeta(name, args) {
    if (args.length !== 2) {
      throw new MexError(`Beta() requires 2 arguments, got ${args.length}`);
    }

    const x = this.emit(args[0]);
    const y = this.emit(args[1]);
    return `\\text{B}(${x},${y})`;
  }

  // Helper: Check if an AST node contains a partial derivative operator
  containsPartial(node) {
    if (!node) return false;
    if (node.kind === 'Ident' && node.name === 'partial') return true;
    if (node.kind === 'Binary') {
      return this.containsPartial(node.left) || this.containsPartial(node.right);
    }
    if (node.kind === 'Script') return this.containsPartial(node.base);
    return false;
  }

  // Helper: Check if an AST node contains a fraction (division operator)
  containsFraction(node) {
    if (!node) return false;
    if (node.kind === 'Binary' && node.op === '/') return true;
    if (node.kind === 'Binary') {
      return this.containsFraction(node.left) || this.containsFraction(node.right);
    }
    if (node.kind === 'Script') return this.containsFraction(node.base);
    if (node.kind === 'Group') return this.containsFraction(node.expr);
    return false;
  }

  // Helper: Check if expression is "mod n" (implicit mult)
  isModulus(node) {
      if (!node) return false;
      if (node.kind === 'Binary' && node.implicit) {
          if (node.left.kind === 'Ident' && node.left.name === 'mod') {
              return true;
          }
      }
      return false;
  }

  emitSequence(node) {
    return node.items.map(item => this.emit(item)).join(',');
  }

  // Check if a group is a matrix structure: [[...], [...]]
  isMatrix(node) {
    if (node.kind !== 'Group' || node.delim !== '[]') return false;
    
    // Content must be a Sequence of Groups with [] delimiter
    if (node.expr && node.expr.kind === 'Sequence') {
      const rows = node.expr.items;
      if (rows.length > 0 && rows.every(item => item.kind === 'Group' && item.delim === '[]')) {
         return true;
      }
    }
    return false;
  }

  emitMatrix(node) {
    const rows = node.expr.items;
    const rowStrings = rows.map(rowGroup => {
      // Row content is likely a Sequence
      if (rowGroup.expr && rowGroup.expr.kind === 'Sequence') {
         // Emit items joined by &
         return rowGroup.expr.items.map(item => this.emit(item)).join(' & ');
      } else {
         // Single item row
         return this.emit(rowGroup.expr);
      }
    });
    
    return `\\begin{bmatrix} ${rowStrings.join(' \\\\ ')} \\end{bmatrix}`;
  }
}

module.exports = { Emitter };
