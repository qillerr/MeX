const { MexTranspiler } = require("./main.js");
const { latexEquals, assertError } = require("./test-utils.js");
const Transpiler = new MexTranspiler();

// ============ WORKING TESTS (MUST PASS) ============
const workingTests = [
  // --- CORE & PRECEDENCE ---
  { in: "(sth)/xy", out: "\\frac{(sth)}{xy}", info: "Denominator grouping bug fix" },
  { in: "a/b+c", out: "\\frac{a}{b}+c", info: "Fraction + addition" },
  { in: "1/xy", out: "\\frac{1}{xy}", info: "Implicit mult in denominator" },
  { in: "a/(b+c)", out: "\\frac{a}{(b+c)}", info: "Grouped denominator" },
  { in: "x^2y", out: "x^{2}y", info: "Script then implicit mult" },
  { in: "x_3^2", out: "x_{3}^{2}", info: "Combined sub and sup" },
  { in: "x^2_3", out: "x_{3}^{2}", info: "Combined sup and sub (canonical order)" },
  { in: "X__1", out: "X_{_{1}}", info: "Double subscript" },
  { in: "sqrt(x)", out: "\\sqrt{x}", info: "Basic sqrt" },
  { in: "sqrt[3](x)", out: "\\sqrt[3]{x}", info: "Indexed sqrt" },
  { in: "l{{\\LaTeX}}l", out: "\\LaTeX", info: "Raw LaTeX passthrough" },
  { in: "t{{hello}}t", out: "\\text{hello}", info: "Text mode" },
  { in: "m{{x+1}}m", out: "\\mathit{x+1}", info: "Mathit mode" },
  { in: "alpha", out: "\\alpha ", info: "Greek letter alpha" },
  { in: "Omega", out: "\\Omega ", info: "Greek letter Omega" },
  { in: "sin(x)", out: "\\sin(x)", info: "Trig function" },
  { in: "ln(x)", out: "\\ln(x)", info: "Logarithm" },
  { in: "-x", out: "-x", info: "Unary minus" },
  { in: "10^-4", out: "10^{-4}", info: "Negative exponent" },
  { in: "infty", out: "\\infty ", info: "Infinity symbol" },

  // --- DERIVATIVES ---
  { in: "d/dx", out: "\\frac{d}{dx}", info: "Basic derivative operator" },
  { in: "dy/dx", out: "\\frac{dy}{dx}", info: "Derivative dy/dx" },
  { in: "df/dx", out: "\\frac{df}{dx}", info: "Derivative df/dx" },
  { in: "d^2y/dx^2", out: "\\frac{d^{2}y}{dx^{2}}", info: "Second derivative" },
  { in: "d^3f/dx^3", out: "\\frac{d^{3}f}{dx^{3}}", info: "Third derivative" },
  { in: "partial f/partial x", out: "\\frac{\\partial f}{\\partial x}", info: "Partial derivative" },
  { in: "partial^2f/partial x partial y", out: "\\frac{\\partial^{2}f}{\\partial x \\partial y}", info: "Mixed partial derivative" },

  // --- INTEGRALS ---
  { in: "int(f(x), dx)", out: "\\int f(x) \\, dx", info: "Indefinite integral" },
  { in: "int(x^2, dx)", out: "\\int x^{2} \\, dx", info: "Indefinite integral with power" },
  { in: "int(sin(x), x, 0, pi)", out: "\\int_{0}^{\\pi } \\sin(x) \\, dx", info: "Definite integral" },
  { in: "int(e^(-x^2), x, -infty, infty)", out: "\\int_{-\\infty }^{\\infty } e^{-x^{2}} \\, dx", info: "Gaussian integral" },
  { in: "oint(F dot dr)", out: "\\oint F \\cdot dr", info: "Contour integral" },

  // --- LIMITS ---
  { in: "lim(x, infty, f(x))", out: "\\lim_{x \\to \\infty } f(x)", info: "Limit to infinity" },
  { in: "lim(x, 0, sin(x)/x)", out: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x}", info: "Limit at 0" },
  { in: "lim(n, infty, (1+1/n)^n)", out: "\\lim_{n \\to \\infty } (1+\\frac{1}{n})^{n}", info: "e limit definition" },
  { in: "lim(x, a^+, f(x))", out: "\\lim_{x \\to a^{+}} f(x)", info: "Right-hand limit" },
  { in: "lim(x, a^-, f(x))", out: "\\lim_{x \\to a^{-}} f(x)", info: "Left-hand limit" },

  // --- SUMS & PRODUCTS ---
  { in: "sum(i, 1, n, i)", out: "\\sum_{i=1}^{n} i", info: "Basic sum" },
  { in: "sum(i, 1, n, i^2)", out: "\\sum_{i=1}^{n} i^{2}", info: "Sum of squares" },
  { in: "sum(k, 0, infty, x^k/k!)", out: "\\sum_{k=0}^{\\infty } \\frac{x^{k}}{k!}", info: "Exponential series" },
  { in: "prod(i, 1, n, i)", out: "\\prod_{i=1}^{n} i", info: "Product notation" },
  { in: "sum(i, 1, n, sum(j, 1, m, a_ij))", out: "\\sum_{i=1}^{n} \\sum_{j=1}^{m} a_{ij}", info: "Double sum" },

  // --- PROBABILITY & STATISTICS ---
  { in: "P(A)", out: "P(A)", info: "Probability of A" },
  { in: "P(A and B)", out: "P(A \\land B)", info: "Probability intersection" },
  { in: "P(A or B)", out: "P(A \\lor B)", info: "Probability union" },
  { in: "E[X]", out: "E[X]", info: "Expected value" },
  { in: "Var(X)", out: "\\text{Var}(X)", info: "Variance" },
  { in: "Cov(X,Y)", out: "\\text{Cov}(X,Y)", info: "Covariance" },
  { in: "(x - mu)^2", out: "(x-\\mu )^{2}", info: "Variance term (x-mu)^2" },
  { in: "sigma^2 = E[(X - mu)^2]", out: "\\sigma^{2}=E[(X-\\mu )^{2}]", info: "Variance definition" },
  { in: "N(mu, sigma^2)", out: "\\mathbb{N}(\\mu ,\\sigma^{2})", info: "Normal distribution" },

  // --- LINEAR ALGEBRA ---
  { in: "det(A)", out: "\\det(A)", info: "Determinant" },
  { in: "tr(A)", out: "\\text{tr}(A)", info: "Trace" },
  { in: "rank(A)", out: "\\text{rank}(A)", info: "Matrix rank" },
  { in: "A^T", out: "A^{T}", info: "Matrix transpose" },
  { in: "A^-1", out: "A^{-1}", info: "Matrix inverse" },
  { in: "||v||", out: "\\|v\\|", info: "Vector norm" },
  { in: "||A||_F", out: "\\|A\\|_{F}", info: "Frobenius norm" },
  { in: "u dot v", out: "u \\cdot v", info: "Dot product" },
  { in: "u cross v", out: "u \\times v", info: "Cross product" },

  // --- LOGIC ---
  { in: "A and B", out: "A \\land B", info: "Logical AND" },
  { in: "A or B", out: "A \\lor B", info: "Logical OR" },
  { in: "not A", out: "\\neg A", info: "Logical NOT" },
  { in: "A implies B", out: "A \\implies B", info: "Logical implication" },
  { in: "A iff B", out: "A \\iff B", info: "Logical equivalence" },
  { in: "forall x", out: "\\forall x", info: "Universal quantifier" },
  { in: "exists x", out: "\\exists x", info: "Existential quantifier" },

  // --- SET THEORY ---
  { in: "A union B", out: "A \\cup B", info: "Set union" },
  { in: "A intersect B", out: "A \\cap B", info: "Set intersection" },
  { in: "A setminus B", out: "A \\setminus B", info: "Set difference" },
  { in: "x in A", out: "x \\in A", info: "Set membership" },
  { in: "x notin A", out: "x \\notin A", info: "Not in set" },
  { in: "A subset B", out: "A \\subset B", info: "Subset" },
  { in: "A subseteq B", out: "A \\subseteq B", info: "Subset or equal" },
  { in: "emptyset", out: "\\emptyset ", info: "Empty set" },
  { in: "{x in R : x > 0}", out: "\\{x \\in \\mathbb{R} :x>0\\}", info: "Set builder notation" },

  // --- SPECIAL FUNCTIONS ---
  { in: "binom(n, k)", out: "\\binom{n}{k}", info: "Binomial coefficient" },
  { in: "floor(x)", out: "\\lfloor x \\rfloor", info: "Floor function" },
  { in: "ceil(x)", out: "\\lceil x \\rceil", info: "Ceiling function" },
  { in: "abs(x)", out: "|x|", info: "Absolute value" },
  { in: "n!", out: "n!", info: "Factorial" },
  { in: "Gamma(x)", out: "\\Gamma (x)", info: "Gamma function" },
  { in: "Beta(x,y)", out: "\\text{B}(x,y)", info: "Beta function" },

  // --- COMPLEX NUMBERS ---
  { in: "Re(z)", out: "\\text{Re}(z)", info: "Real part" },
  { in: "Im(z)", out: "\\text{Im}(z)", info: "Imaginary part" },
  { in: "conj(z)", out: "\\overline{z}", info: "Complex conjugate" },
  { in: "arg(z)", out: "\\arg(z)", info: "Argument" },
  { in: "e^(i theta)", out: "e^{i\\theta }", info: "Euler's formula" },
  { in: "e^(i pi) + 1 = 0", out: "e^{i\\pi }+1=0", info: "Euler's identity" },

  // --- CALCULUS OF VARIATIONS ---
  { in: "delta F/delta f", out: "\\frac{\\delta F}{\\delta f}", info: "Functional derivative" },

  // --- PHYSICS NOTATION ---
  { in: "nabla f", out: "\\nabla f", info: "Gradient" },
  { in: "laplacian f", out: "\\nabla^{2} f", info: "Laplacian" },
  { in: "F = m*a", out: "F=m \\cdot a", info: "Newton's second law" },
  { in: "E = m*c^2", out: "E=m \\cdot c^{2}", info: "Mass-energy equivalence" },

  // --- NUMBER THEORY ---
  { in: "a mod n", out: "a \\bmod n", info: "Modulo operation" },
  { in: "gcd(a, b)", out: "\\gcd(a,b)", info: "Greatest common divisor" },
  { in: "lcm(a, b)", out: "\\text{lcm}(a,b)", info: "Least common multiple" },

  // --- CONTINUED FRACTIONS ---
  { in: "a_0 + 1/(a_1 + 1/(a_2 + 1/a_3))", out: "a_{0}+\\frac{1}{a_{1}+\\frac{1}{a_{2}+\\frac{1}{a_{3}}}}", info: "Continued fraction" },

  // --- MATRICES (Sequences) ---
  { in: "a_n = 1/n", out: "a_{n}=\\frac{1}{n}", info: "Sequence definition" },
  { in: "lim(n, infty, a_n)", out: "\\lim_{n \\to \\infty } a_{n}", info: "Sequence limit" },

  // --- TRIGONOMETRY ---
  { in: "sin^2(x) + cos^2(x) = 1", out: "\\sin^{2}(x)+\\cos^{2}(x)=1", info: "Pythagorean identity" },
  { in: "arcsin(x)", out: "\\arcsin(x)", info: "Inverse sine" },
  { in: "arctan(y/x)", out: "\\arctan(\\frac{y}{x})", info: "Inverse tangent with fraction" },

  // --- INEQUALITIES ---
  { in: "x <= y", out: "x \\leq y", info: "Less than or equal" },
  { in: "x >= y", out: "x \\geq y", info: "Greater than or equal" },
  { in: "x << y", out: "x \\ll y", info: "Much less than" },
  { in: "x >> y", out: "x \\gg y", info: "Much greater than" },

  // --- ADVANCED CALCULUS ---
  { in: "int(f(x)*g(x), dx) = [f(x)*G(x)] - int(f'(x)*G(x), dx)", out: "\\int f(x) \\cdot g(x) \\, dx=[f(x) \\cdot G(x)]-\\int f'(x) \\cdot G(x) \\, dx", info: "Integration by parts" },
  { in: "sum(n, 0, infty, f^((n))(a)/n! * (x-a)^n)", out: "\\sum_{n=0}^{\\infty } \\frac{f^{(n)}(a)}{n!} \\cdot (x-a)^{n}", info: "Taylor series" },

  // --- NEWLY IMPLEMENTED (Phase 1) ---
  { in: "partial u/partial t + partial u/partial x", out: "\\frac{\\partial u}{\\partial t}+\\frac{\\partial u}{\\partial x}", info: "PDE heat equation term" },
  { in: "int(int(f(x,y), dy), dx)", out: "\\int \\int f(x,y) \\, dy \\, dx", info: "Double integral" },
  { in: "int(int(int(f(x,y,z), dz), dy), dx)", out: "\\int \\int \\int f(x,y,z) \\, dz \\, dy \\, dx", info: "Triple integral" },
  { in: "P(A|B)", out: "P(A|B)", info: "Conditional probability" },
  { in: "sigma^2 = E[(X - mu)^2]", out: "\\sigma^{2}=E[(X-\\mu )^{2}]", info: "Variance definition" },
  { in: "N(mu, sigma^2)", out: "\\mathbb{N}(\\mu ,\\sigma^{2})", info: "Normal distribution" },
  { in: "<u, v>", out: "\\langle u,v \\rangle", info: "Inner product" },
  { in: "lambda_1, lambda_2, ..., lambda_n", out: "\\lambda_{1},\\lambda_{2},...,\\lambda_{n}", info: "Eigenvalues sequence" },
  { in: "forall epsilon > 0, exists delta > 0", out: "\\forall \\epsilon >0,\\exists \\delta >0", info: "Epsilon-delta definition" },
  { in: "|A|", out: "|A|", info: "Set cardinality" },
  { in: "nabla dot F", out: "\\nabla \\cdot F", info: "Divergence" },
  { in: "nabla cross F", out: "\\nabla \\times F", info: "Curl" },
  { in: "a equiv b (mod n)", out: "a \\equiv b\\pmod{n}", info: "Modular congruence" },
  { in: "[[a, b], [c, d]]", out: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", info: "2x2 matrix" },
  { in: "det([[a, b], [c, d]])", out: "\\det \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", info: "Determinant of 2x2 matrix" },
  { in: "x approx y", out: "x \\approx y", info: "Approximately equal" },
  { in: "x neq y", out: "x \\neq y", info: "Not equal" },
];

// ============ ERROR TESTS (MUST THROW) ============
const errorTests = [
  { in: "((", error: "Expected closing ')'", info: "Unmatched paren" },
  { in: "l{{", error: "Unclosed range mode", info: "Unclosed latex mode" },
  { in: "sqrt", error: "requires parentheses", info: "Sqrt without args" },
  { in: "[[", error: "Expected closing ']'", info: "Unmatched brackets" }
];

// ============ FUTURE TESTS (KNOWN UNIMPLEMENTED) ============
// These are currently failing and need work
const futureTests = [];

// ============ RUNNER ============
let workingPassed = 0;
let workingFailed = 0;
const workingFailures = [];

console.log("============ RUNNING WORKING TESTS (MUST PASS) ============\n");
const perfStart = Date.now();

for (const test of workingTests) {
  try {
    const result = Transpiler.transpile(test.in);
    if (latexEquals(result, test.out)) {
      workingPassed++;
    } else {
      workingFailed++;
      workingFailures.push({ info: test.info, input: test.in, expected: test.out, got: result });
    }
  } catch (e) {
    workingFailed++;
    workingFailures.push({ info: test.info, input: test.in, expected: test.out, got: `ERROR: ${e.message}` });
  }
}

// Check errors
console.log("\n============ RUNNING ERROR TESTS (MUST THROW) ============\n");
let errorPassed = 0;
let errorFailed = 0;

for (const test of errorTests) {
  try {
    try {
        Transpiler.transpile(test.in);
        // If we get here, it didn't throw
        errorFailed++;
        workingFailures.push({ info: test.info, input: test.in, expected: "MexError", got: "No error thrown" });
    } catch(e) {
        if (e.message.includes(test.error)) {
            errorPassed++;
        } else {
            errorFailed++;
            workingFailures.push({ info: test.info, input: test.in, expected: test.error, got: e.message });
        }
    }
  } catch (e) {
    // Should not happen
  }
}

const perfEnd = Date.now();

console.log(`Working: ${workingPassed}/${workingTests.length}`);
console.log(`Errors:  ${errorPassed}/${errorTests.length}`);

// Future tests (Aspirational)
let futurePassed = 0;
let futureFailed = 0;
const futureFailures = [];

console.log("\n============ RUNNING FUTURE TESTS (ASPIRATIONAL) ============\n");
for (const test of futureTests) {
  try {
    const result = Transpiler.transpile(test.in);
    if (latexEquals(result, test.out)) {
      futurePassed++;
    } else {
      futureFailed++;
      futureFailures.push({ info: test.info, input: test.in, expected: test.out, got: result });
    }
  } catch (e) {
    futureFailed++;
    futureFailures.push({ info: test.info, input: test.in, expected: test.out, got: `ERROR: ${e.message}` });
  }
}

console.log(`Future Passed: ${futurePassed}/${futureTests.length}`);
console.log(`Future Pending: ${futureFailed}/${futureTests.length}`);

if (workingFailed > 0 || errorFailed > 0) {
    console.log("\n❌ FAILURES (Action Required):");
    workingFailures.forEach(f => {
        console.log(`  ${f.info}:`);
        console.log(`    In:  "${f.input}"`);
        console.log(`    Exp: "${f.expected}"`);
        console.log(`    Got: "${f.got}"`);
    });
    process.exit(1);
} else {
    console.log("\n✓ All working and error tests pass!");
    process.exit(0);
}
