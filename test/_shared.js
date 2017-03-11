
var fs = require('fs');

var nearley = require('../lib/nearley.js');
var Compile = require('../lib/compile.js');
var parserGrammar = nearley.Grammar.fromCompiled(require('../lib/nearley-language-bootstrapped.js'));
var generate = require('../lib/generate.js');

function parse(grammar, input) {
    var p = new nearley.Parser(grammar);
    p.feed(input);
    return p.results;
}

function compileOnly(source) {
    // parse
    var results = parse(parserGrammar, source);

    // compile
    var c = Compile(results[0], {});

    // generate
    return generate(c, 'grammar');
}

function compile(source) {
    var compiledGrammar = compileOnly(source);

    // eval
    return evalGrammar(compiledGrammar);
}

function evalGrammar(compiledGrammar) {
    var f = new Function('module', compiledGrammar);
    var m = {exports: {}};
    f(m);
    return new nearley.Grammar.fromCompiled(m.exports);
}

function read(filename) {
    return fs.readFileSync(filename, 'utf-8');
}

module.exports = {
    nearley: nearley,
    read: read,
    compile: compile,
    compileOnly: compileOnly,
    parse: parse,
    evalGrammar: evalGrammar,
};

