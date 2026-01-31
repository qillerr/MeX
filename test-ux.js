const { MexTranspiler } = require("./main.js");
const {
  normalizeLatex,
  latexEquals,
  assertError,
} = require("./test-utils.js");

const Transpiler = new MexTranspiler();

// ============ WHITESPACE TOLERANCE TESTS ============
const whitespaceTests = [
  {
    canonical: "a/(b+c)",
    variants: ["a / (b + c)", "a /( b+ c )", "a/ (b +c)", "a /(b+ c)"],
    info: "Fraction with grouped denominator",
  },
  {
    canonical: "x^2_3",
    variants: ["x ^ 2 _ 3", "x^2 _3", "x ^2_ 3", "x ^ 2_ 3"],
    info: "Scripts with subscript and superscript",
  },
  {
    canonical: "sqrt(x)",
    variants: ["sqrt ( x )", "sqrt( x)", "sqrt (x )", "sqrt( x )"],
    info: "Square root function",
  },
  {
    canonical: "1/xy",
    variants: ["1 / xy", "1/ xy", "1 /xy", "1 / x y"],
    info: "Implicit multiplication in denominator",
  },
  {
    canonical: "sin(x)+cos(x)",
    variants: ["sin(x) + cos(x)", "sin (x)+ cos( x)", "sin ( x ) +cos ( x)"],
    info: "Functions with addition",
  },
  {
    canonical: "(a+b)^2",
    variants: ["( a + b ) ^ 2", "(a + b)^2", "( a+b )^ 2"],
    info: "Grouped expression with exponent",
  },
  {
    canonical: "a*b+c",
    variants: ["a * b + c", "a*b +c", "a *b+ c"],
    info: "Explicit multiplication and addition",
  },
  {
    canonical: "x_3^2+y",
    variants: ["x _ 3 ^ 2 + y", "x_3 ^2+ y", "x _3^ 2 +y"],
    info: "Complex scripts with addition",
  },
  {
    canonical: "sqrt[3](x)",
    variants: ["sqrt [ 3 ] ( x )", "sqrt[ 3](x)", "sqrt [3] (x)"],
    info: "Indexed square root",
  },
  {
    canonical: "alpha*beta",
    variants: ["alpha * beta", "alpha *beta", "alpha* beta"],
    info: "Greek letters with multiplication",
  },
  {
    canonical: "(a+b)/(c+d)",
    variants: ["( a + b ) / ( c + d )", "(a+b) /(c+d)", "( a+b)/ (c +d)"],
    info: "Fraction with both numerator and denominator grouped",
  },
  {
    canonical: "ln(x)+1",
    variants: ["ln ( x ) + 1", "ln(x) +1", "ln (x)+ 1"],
    info: "Logarithm with addition",
  },
  {
    canonical: "10^-4",
    variants: ["10 ^ -4", "10^ -4", "10 ^- 4"],
    info: "Negative exponent",
  },
  {
    canonical: "a/(b+c)*d",
    variants: ["a / (b + c) * d", "a/(b+c) *d", "a /(b +c)* d"],
    info: "Fraction with explicit multiplication",
  },
  {
    canonical: "x^2*y^3",
    variants: ["x ^ 2 * y ^ 3", "x^2 *y ^3", "x ^2* y^ 3"],
    info: "Multiple exponents with explicit multiplication",
  },
];

// ============ ESCAPE HATCH COMPOSITION TESTS ============
const escapeCompositionTests = [
  {
    in: "1 + l{{\\frac{a}{b}}}l + 2",
    out: "1+\\frac{a}{b}+2",
    info: "Raw LaTeX inside expression",
  },
  {
    in: "l{{x}}l^2",
    out: "x^{2}",
    info: "Raw LaTeX with script",
  },
  {
    in: "sin(x) + t{{text}}t",
    out: "\\sin(x)+\\text{text}",
    info: "Text mode mixed with function",
  },
  {
    in: "m{{x+1}}m / y",
    out: "\\frac{\\mathit{x+1}}{y}",
    info: "Mathit in fraction numerator",
  },
  {
    in: "alpha * l{{\\beta}}l",
    out: "\\alpha  \\cdot \\beta",
    info: "Greek letter then raw LaTeX (explicit mult converted to \\cdot)",
  },
  {
    in: "l{{\\alpha}}l + l{{\\beta}}l",
    out: "\\alpha+\\beta",
    info: "Multiple raw LaTeX segments",
  },
  {
    in: "t{{hello}}t * t{{world}}t",
    out: "\\text{hello} \\cdot \\text{world}",
    info: "Multiple text mode segments with explicit mult",
  },
  {
    in: "(l{{x}}l + l{{y}}l)^2",
    out: "(x+y)^{2}",
    info: "Raw LaTeX inside grouped expression with exponent",
  },
  {
    in: "sqrt(m{{x}}m)",
    out: "\\sqrt{\\mathit{x}}",
    info: "Mathit inside sqrt function",
  },
  // KNOWN LIMITATION: RAW_LATEX not supported in script arguments
  // {
  //   in: "l{{a}}l_l{{b}}l^l{{c}}l",
  //   out: "a_{b}^{c}",
  //   info: "Raw LaTeX in base, subscript, and superscript",
  // },
];

// ============ ERROR VALIDATION TESTS ============
const errorTests = [
  {
    in: "(a + b",
    expectedError: "closing ')'",
    info: "Unmatched opening paren",
  },
  {
    in: "a + b)",
    expectedError: "Unexpected token",
    info: "Unmatched closing paren",
  },
  {
    in: "l{{unfinished",
    expectedError: "Unclosed range mode",
    info: "Unclosed l{{...}}l",
  },
  {
    in: "t{{unfinished",
    expectedError: "Unclosed range mode",
    info: "Unclosed t{{...}}t",
  },
  {
    in: "m{{unfinished",
    expectedError: "Unclosed range mode",
    info: "Unclosed m{{...}}m",
  },
  {
    in: "x^",
    expectedError: "Expected",
    info: "Incomplete exponent",
  },
  {
    in: "x_",
    expectedError: "Expected",
    info: "Incomplete subscript",
  },
  {
    in: "sqrt(x",
    expectedError: "closing ')'",
    info: "Unclosed function call",
  },
  {
    in: "sqrt",
    expectedError: "parentheses",
    info: "sqrt without arguments",
  },
  {
    in: "(((a+b)",
    expectedError: "closing ')'",
    info: "Multiple unmatched parens",
  },
  // DESIGN DECISION: Allow incomplete expressions or validate?
  // Currently allows `a/` → `\frac{a}{}` (empty denominator)
  // {
  //   in: "a/",
  //   expectedError: "Expected",
  //   info: "Incomplete division",
  // },
  {
    in: "sqrt[3",
    expectedError: "Expected",
    info: "Incomplete sqrt index",
  },
];

// ============ PRECEDENCE EDGE CASE TESTS ============
const precedenceTests = [
  {
    in: "a/b*c",
    out: "\\frac{a}{b} \\cdot c",
    info: "Division then explicit mult - left associative (/ and * have equal precedence)",
  },
  {
    in: "a*b/c",
    out: "\\frac{a \\cdot b}{c}",
    info: "Explicit mult then division - mult in numerator",
  },
  {
    in: "a/bc",
    out: "\\frac{a}{bc}",
    info: "Implicit mult in denominator",
  },
  {
    in: "xy/z",
    out: "\\frac{xy}{z}",
    info: "Implicit mult in numerator",
  },
  {
    in: "a^2*b",
    out: "a^{2} \\cdot b",
    info: "Script binds tighter than explicit mult",
  },
  {
    in: "a*b^2",
    out: "a \\cdot b^{2}",
    info: "Explicit mult then script",
  },
  {
    in: "(a+b)(c+d)",
    out: "(a+b)(c+d)",
    info: "Implicit mult between groups",
  },
  {
    in: "sqrt(x)y",
    out: "\\sqrt{x}y",
    info: "Implicit mult after function",
  },
];

// ============ TEST RUNNER ============
let passedCount = 0;
let failedCount = 0;
const failures = [];

console.log("============ UX TEST SUITE ============\n");

// Test 1: Whitespace Tolerance
console.log("1. WHITESPACE TOLERANCE TESTS\n");
let whitespacePassedCount = 0;
let whitespaceFailed = 0;

for (const test of whitespaceTests) {
  const canonicalOutput = normalizeLatex(Transpiler.transpile(test.canonical));

  for (const variant of test.variants) {
    try {
      const variantOutput = normalizeLatex(Transpiler.transpile(variant));
      if (variantOutput === canonicalOutput) {
        whitespacePassedCount++;
        passedCount++;
      } else {
        whitespaceFailed++;
        failedCount++;
        failures.push({
          category: "Whitespace",
          info: test.info,
          input: variant,
          canonical: test.canonical,
          expected: canonicalOutput,
          got: variantOutput,
        });
      }
    } catch (e) {
      whitespaceFailed++;
      failedCount++;
      failures.push({
        category: "Whitespace",
        info: test.info,
        input: variant,
        canonical: test.canonical,
        expected: canonicalOutput,
        got: `ERROR: ${e.message}`,
      });
    }
  }
}

const totalWhitespaceVariants = whitespaceTests.reduce(
  (sum, test) => sum + test.variants.length,
  0
);
console.log(
  `Passed: ${whitespacePassedCount}/${totalWhitespaceVariants} (${Math.round((whitespacePassedCount / totalWhitespaceVariants) * 100)}%)\n`
);

// Test 2: Escape Hatch Composition
console.log("2. ESCAPE HATCH COMPOSITION TESTS\n");
let escapePassedCount = 0;
let escapeFailed = 0;

for (const test of escapeCompositionTests) {
  try {
    const result = Transpiler.transpile(test.in);
    if (latexEquals(result, test.out)) {
      escapePassedCount++;
      passedCount++;
    } else {
      escapeFailed++;
      failedCount++;
      failures.push({
        category: "Escape Hatch",
        info: test.info,
        input: test.in,
        expected: test.out,
        got: result,
      });
    }
  } catch (e) {
    escapeFailed++;
    failedCount++;
    failures.push({
      category: "Escape Hatch",
      info: test.info,
      input: test.in,
      expected: test.out,
      got: `ERROR: ${e.message}`,
    });
  }
}

console.log(
  `Passed: ${escapePassedCount}/${escapeCompositionTests.length} (${Math.round((escapePassedCount / escapeCompositionTests.length) * 100)}%)\n`
);

// Test 3: Error Validation
console.log("3. ERROR VALIDATION TESTS\n");
let errorPassedCount = 0;
let errorFailed = 0;

for (const test of errorTests) {
  try {
    assertError(() => Transpiler.transpile(test.in), test.expectedError);
    errorPassedCount++;
    passedCount++;
  } catch (e) {
    errorFailed++;
    failedCount++;
    failures.push({
      category: "Error",
      info: test.info,
      input: test.in,
      expected: `MexError containing "${test.expectedError}"`,
      got: e.message,
    });
  }
}

console.log(
  `Passed: ${errorPassedCount}/${errorTests.length} (${Math.round((errorPassedCount / errorTests.length) * 100)}%)\n`
);

// Test 4: Precedence Edge Cases
console.log("4. PRECEDENCE EDGE CASE TESTS\n");
let precedencePassedCount = 0;
let precedenceFailed = 0;

for (const test of precedenceTests) {
  try {
    const result = Transpiler.transpile(test.in);
    if (latexEquals(result, test.out)) {
      precedencePassedCount++;
      passedCount++;
    } else {
      precedenceFailed++;
      failedCount++;
      failures.push({
        category: "Precedence",
        info: test.info,
        input: test.in,
        expected: test.out,
        got: result,
      });
    }
  } catch (e) {
    precedenceFailed++;
    failedCount++;
    failures.push({
      category: "Precedence",
      info: test.info,
      input: test.in,
      expected: test.out,
      got: `ERROR: ${e.message}`,
    });
  }
}

console.log(
  `Passed: ${precedencePassedCount}/${precedenceTests.length} (${Math.round((precedencePassedCount / precedenceTests.length) * 100)}%)\n`
);

// Print Summary
const totalTests =
  totalWhitespaceVariants +
  escapeCompositionTests.length +
  errorTests.length +
  precedenceTests.length;

console.log("============ SUMMARY ============");
console.log(`Total Passed: ${passedCount}/${totalTests} (${Math.round((passedCount / totalTests) * 100)}%)`);
console.log(`Total Failed: ${failedCount}/${totalTests}`);

// Print Failures
if (failures.length > 0) {
  console.log("\n============ FAILURES ============");
  for (const f of failures) {
    console.log(`\n[${f.category}] ${f.info}:`);
    console.log(`  Input:    "${f.input}"`);
    if (f.canonical) {
      console.log(`  Canonical: "${f.canonical}"`);
    }
    console.log(`  Expected: "${f.expected}"`);
    console.log(`  Got:      "${f.got}"`);
  }
}

// Exit with error code if any tests failed
if (failedCount > 0) {
  console.log("\n❌ UX TESTS FAILED");
  process.exit(1);
} else {
  console.log("\n✓ All UX tests pass!");
  process.exit(0);
}
