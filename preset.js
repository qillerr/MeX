module.exports.exclude = '(?<!\\.)';

//If you don't want it escapable, then use regex instead of string
module.exports.Separators = [

    //I don't know if it should be continued that way
    { val: 'l**', name: 'latex', type: 'paired' }, //TODO it's not working
    { val: '**l', name: 'right_latex' }, //TODO it's not working

    { reg: /(?<!(\.|\d|\)|\S))%.*$/m, name: 'latex-line', mode: "ignore_borders", range: [1] },
    { reg: /(?<!\.)%l.*$/m, name: 'latex-line', mode: "ignore_borders", range: [2]  },

    { reg: /\n/, name: 'new_line' },
    { reg: /(?<!\.)t{{(.(?!([\#])))*?}}t/, name: '#text#', mode: '##', facade: 'M', range: [3,-3] },
    { reg: /(?<!\.)l{{(.(?!([\#])))*?}}l/, name: 'latex_range', mode: 'ignore_borders', range: [3,-3] },
    { reg: /(?<!\.)m{{(.(?!([\#])))*?}}m/, name: '#mathit#', mode: '##', facade: 'M', range: [3,-3] },

    { reg: /(?<!(\.|\d|\)))%.*$/m, name: 'comment' },
    { reg: /(?<!(\S))%.*$/m, name: 'comm', mode: "ignore_borders", range: [1] },
    
    { reg: /(?<!\\)\\(?!\\)/, name: 'trigger' },
    { reg: /\\/, name: 'backslash' },

    // Example of use: [3,5) for a range
    { val: '.[', name: '\\[', facade: 'non-mutable', mode: 'choose name' },
    { val: '.]', name: '\\]', facade: 'non-mutable', mode: 'choose name' },
    { val: '.(', name: '\\(', facade: 'non-mutable', mode: 'choose name' },
    { val: '.)', name: '\\)', facade: 'non-mutable', mode: 'choose name' },
    
    { reg: /%/, name: 'percent_sign', facade: 'percent' },
    { reg: /-?\d+(\.\d*(\(\d+\))?)?/, name: 'number', facade: 'M' },
    { val: ',', name: 'comma' },

    { val: '[', closingVal: ']', name: 'bracket', type: 'paired' },
    { val: ']', name: 'right_bracket' },
    { val: '{', closingVal: '}', name: 'curly', type: 'paired' },
    { val: '}', name: 'right_curly' },
    { val: '(', closingVal: ')', name: 'paren', type: 'paired', facade: 'M' },
    { val: ')', name: 'right_paren' },
    

    // Operator symbols
    { val: '<<', name: 'll', facade: 'non-mutable', mode: 'choose name' },
    { val: '>>', name: 'gg', facade: 'non-mutable', mode: 'choose name' },
    { val: '~~', name: 'approx', facade: 'non-mutable', mode: 'choose name' },
    { val: '~', name: 'sim', facade: 'non-mutable', mode: 'choose name' },
    { val: '!=', name: 'neq', facade: 'non-mutable', mode: 'choose name' },
    { val: '>=', name: 'geq', facade: 'non-mutable', mode: 'choose name' },
    { val: '<=', name: 'leq', facade: 'non-mutable', mode: 'choose name' },
    { val: '->', name: 'to', facade: 'sep_symbol', mode: 'choose name' },

    { val: '^', name: 'power' },
    { val: '__', name: '2sub' },
    { val: '_', name: 'sub' },
    { val: '>', name: 'greater' },
    { val: '>', name: 'less' },
    
    { val: '+-', name: 'pm', facade: 'non-mutable', mode: 'choose name' },
    { val: '+', name: 'plus' },
    { val: '-', name: 'minus' },
    { val: '*', name: 'multiply' },
    { val: '/', name: 'divide' },
    
    { val: '=', name: 'equal' },
    
    //Simple functions
    { val: 'sin', name: 'sin', facade: 'SF', mode: 'choose name' },
    { val: 'cos', name: 'cos', facade: 'SF', mode: 'choose name' },
    { val: 'tan', name: 'tan', facade: 'SF', mode: 'choose name' },
    { val: 'ctg', name: 'cot', facade: 'SF', mode: 'choose name' },
    { val: 'tg', name: 'tan', facade: 'SF', mode: 'choose name' },
    { val: 'cot', name: 'cot', facade: 'SF', mode: 'choose name' },
    { val: 'ln', name: 'ln', facade: 'SF', mode: 'choose name' },
    
    
    { val: 'int', name: 'int', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'lim', name: 'lim', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'sum', name: 'sum', facade: 'sep_symbol', mode: 'choose name' },


    { val: 'infty', name: 'infty', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'inf', name: 'infty', facade: 'sep_symbol', mode: 'choose name' },
    // { val: 'to', name: 'to', facade: 'sep_symbol', mode: 'choose name' }, disabled -> is working instead
    
    
    // Greek
    
    { val: 'vartheta', name: 'vartheta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'varepsilon', name: 'varepsilon', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'varpi', name: 'varpi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'varsigma', name: 'varsigma', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'varrho', name: 'varrho', facade: 'sep_symbol', mode: 'choose name' },

    { val: 'alpha', name: 'alpha', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'beta', name: 'beta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'gamma', name: 'gamma', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'delta', name: 'delta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'epsilon', name: 'epsilon', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'zeta', name: 'zeta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'eta', name: 'eta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Gamma', name: 'Gamma', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Delta', name: 'Delta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Theta', name: 'Theta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'theta', name: 'theta', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'iota', name: 'iota', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'kappa', name: 'kappa', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'lambda', name: 'lambda', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'mu', name: 'mu', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'nu', name: 'nu', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'xi', name: 'xi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Lambda', name: 'Lambda', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Xi', name: 'Xi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Pi', name: 'pi', facade: 'sep_symbol', mode: 'choose name' }, //ease of use
    { val: 'pi', name: 'pi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'rho', name: 'rho', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'sigma', name: 'sigma', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'tau', name: 'tau', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Sigma', name: 'Sigma', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Upsilon', name: 'Upsilon', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Phi', name: 'Phi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'upsilon', name: 'upsilon', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'phi', name: 'phi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'varphi', name: 'varphi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'chi', name: 'chi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'psi', name: 'psi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'omega', name: 'omega', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Psi', name: 'Psi', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'Omega', name: 'Omega', facade: 'sep_symbol', mode: 'choose name' },
    { val: 'micro', name: 'mu', facade: 'sep_symbol', mode: 'choose name' },

    //Here some easier symbols

    { val: 'deg', name: '°', facade: 'degree', mode: 'choose name' },
    { val: 'land', name: 'land', facade: 'non-mutable', mode: 'choose name' },
    { val: 'lor', name: 'lor', facade: 'non-mutable', mode: 'choose name' },
    { val: '...', name: 'dots', facade: 'non-mutable', mode: 'choose name' },


    { val: 'sqrt', name: 'root' },

    { val: '!in', name: 'notin', facade: 'non-mutable', mode: 'choose name' },
    { val: 'in', name: 'in', facade: 'non-mutable', mode: 'choose name' },

    { val: ' X ', name: 'times', facade: 'non-mutable', mode: 'choose name' },


    //At the end here it is:
    { reg: /\w/, name: 'character', facade: 'M'},
    { reg: /  /, name: ' \\; ', mode: 'choose name'},

];

module.exports.Patterns = [

    { in: ['non-mutable'], out: ['\\', 0, ' '], name: 'symbol' },
    { in: ['M', 'percent_sign'], out: [0, '\\%'], name: 'percent', facade: 'M', type: 'facade' },
    { in: ['sep_symbol'], out: ['\\', 0, ' '], name: 'symbol', facade: 'M', type: 'facade' },
    { in: ['SF', 'paren'], out: ['\\',0,'(', 1,')'], name: 'simple_f', facade: 'M', type: 'facade' },
    { in: ['SF', 'power', 'M', 'paren'], out: ['\\',0,'^{',2,'}(', 3,')'], name: 'simple_f', facade: 'M', type: 'facade' },
    { in: ['SF'], out: ['\\',0,' '], name: 'simple_f', facade: 'M', type: 'facade' },
    { in: ['root', 'paren'], out: ['\\sqrt{',1,'}'], name: 'sqrt', facade: 'M', type: 'facade' },
    { in: ['root', 'bracket', 'paren'], out: ['\\sqrt[',1,']{',2,'}'], name: 'n_rt', facade: 'M', type: 'facade' },
    { in: ['M', 'sub', 'M', 'power', 'M'], out: [0,'_{',2,'}^{', 4,'}'], name: 'merged_sub_pow', facade: 'M'},
    { in: ['M', 'sub', 'M'], out: [0,'_{',2,'}'], name: 'merged_subscript', facade: 'M'},
    { in: ['M', '2sub', 'M'], out: [0,'_{_{',2,'}}'], name: 'merged_subscript', facade: 'M'},
    { in: ['M', 'power', 'M'], out: [0,'^{',2,'}'], name: 'merged_power', facade: 'M'},
    { in: ['M', 'divide', 'M'], out: ['\\frac{',0,'}{',2,'}'], name: 'fraction' },

];

