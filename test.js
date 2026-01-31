const tests = [
  {
    r: "critical",
    in: `(x+(x+xy)/y)/5`,
    out: `\\frac{x+\\frac{x+xy}{y}}{5}`,
    info: "Basic fractions",
  },
  {
    r: "critical",
    in: `sqrt( 1 + 3/4^2 )`,
    out: `\\sqrt{1 + \\frac{3}{4^{2}}}`,
    info: "Basic sqrt+fraction",
  },
  {
    r: "critical",
    in: `x^2 y^(2^2) x^alpha + X_1 + X__1 + X_(alpha) 2*10^-4`,
    out: `x^{2} y^{2^{2}}x^{\\alpha } + X_{1} + X_{_{1}} + X_{\\alpha }2*10^{-4}`,
    info: "Sup/sub",
  },
  {
    r: "important",
    in: `t{{ l\\{\\{ X \\}\\}l }}t : l{{ \\text{Latex inline } \\infty }}l     m{{ mathit }}m`,
    out: `\\text{ l\\{\\{ X \\}\\}l } :  \\text{Latex inline } \\infty  \\;  \\;  \\mathit{ mathit }`,
    info: "Basic text/inline",
  },
];
const { MexTranspiler } = require("./main.js");
const Transpiler = new MexTranspiler();

const results = {
  critical: { requirement: "literal", passed: 0, failed: 0 },
  important: { requirement: "literal", passed: 0, failed: 0 },
};

let perf_start = Date.now();
for (let test of tests) {
  try {
    let res = Transpiler.transpile(test.in);
    if (results[test.r].requirement == "literal") {
      if (res == test.out) {
        results[test.r].passed++;
      } else {
        console.log("Failed(" + test.info + "):" + res);
        results[test.r].failed++;
      }
    }
  } catch (e) {
    console.log(e);
    results[test.r].failed++;
  }
}
console.log("----TEST RESULTS----");
for (let r in results) {
  let result = results[r];
  console.log(
    "Results for " +
      r +
      " - " +
      Math.round((result.passed / (result.passed + result.failed)) * 100) +
      "% Passed" +
      (result.failed ? " - Failed " + result.failed : ""),
  );
}
let perf_end = Date.now();

console.log(
  "Test duration[ms]: " + (perf_end.valueOf() - perf_start.valueOf()),
);
// Hi!
