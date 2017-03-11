// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }


var Lexer = (typeof module === 'object' && module.exports) ?  require('./lexer') : nearley.Lexer;
var lex = Lexer([
    ['string', /"((?:[^\\"\n]|\\[]|\\u[0-9a-fA-F]{4})*?)"/],
    ['WS', /[ \f\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/],
    ['comment', /#[^\n]*?$/],
    ['word', /[\w\?\+]+/],
    ['arrow', ['->', '=>']],
    ['quantifier', [':+', ':*', ':?']],
    ['alt', '|'],
    ['js', /\{%((?:[^%]|%[^}])*)%\}/],
])
var grammar = {
    ParserRules: [
    {"name": "final", "symbols": ["whit?", "prog", "whit?"], "postprocess": function(d) { return d[1]; }},
    {"name": "prog", "symbols": ["prod"], "postprocess": function(d) { return [d[0]]; }},
    {"name": "prog", "symbols": ["prod", "whit", "prog"], "postprocess": function(d) { return [d[0]].concat(d[2]); }},
    {"name": "prod", "symbols": ["word", "whit?", lex.arrow, "whit?", "expression+"], "postprocess": function(d) { return {name: d[0], rules: d[5]}; }},
    {"name": "prod", "symbols": ["word", {"literal":"["}, "wordlist", {"literal":"]"}, "whit?", lex.arrow, "whit?", "expression+"], "postprocess": function(d) {return {macro: d[0], args: d[2], exprs: d[8]}}},
    {"name": "prod", "symbols": [{"literal":"@"}, "whit?", "js"], "postprocess": function(d) { return {body: d[2]}; }},
    {"name": "prod", "symbols": [{"literal":"@"}, "word", "whit", "word"], "postprocess": function(d) { return {config: d[1], value: d[3]}; }},
    {"name": "prod$string$1", "symbols": [{"literal":"@"}, {"literal":"i"}, {"literal":"n"}, {"literal":"c"}, {"literal":"l"}, {"literal":"u"}, {"literal":"d"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "prod", "symbols": ["prod$string$1", "whit?", lex.string], "postprocess": function(d) {return {include: d[2].literal, builtin: false}}},
    {"name": "prod$string$2", "symbols": [{"literal":"@"}, {"literal":"b"}, {"literal":"u"}, {"literal":"i"}, {"literal":"l"}, {"literal":"t"}, {"literal":"i"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "prod", "symbols": ["prod$string$2", "whit?", lex.string], "postprocess": function(d) {return {include: d[2].literal, builtin: true }}},
    {"name": "expression+", "symbols": ["completeexpression"]},
    {"name": "expression+", "symbols": ["expression+", "whit?", lex.alt, "whit?", "completeexpression"], "postprocess": function(d) { return d[0].concat([d[4]]); }},
    {"name": "expressionlist", "symbols": ["completeexpression"]},
    {"name": "expressionlist", "symbols": ["expressionlist", "whit?", {"literal":","}, "whit?", "completeexpression"], "postprocess": function(d) { return d[0].concat([d[4]]); }},
    {"name": "wordlist", "symbols": ["word"]},
    {"name": "wordlist", "symbols": ["wordlist", "whit?", {"literal":","}, "whit?", "word"], "postprocess": function(d) { return d[0].concat([d[4]]); }},
    {"name": "completeexpression", "symbols": ["expr"], "postprocess": function(d) { return {tokens: d[0]}; }},
    {"name": "completeexpression", "symbols": ["expr", "whit?", "js"], "postprocess": function(d) { return {tokens: d[0], postprocess: d[2]}; }},
    {"name": "expr_member", "symbols": ["word"], "postprocess": id},
    {"name": "expr_member", "symbols": [{"literal":"$"}, "word"], "postprocess": function(d) {return {mixin: d[1]}}},
    {"name": "expr_member", "symbols": ["word", {"literal":"["}, "expressionlist", {"literal":"]"}], "postprocess": function(d) {return {macrocall: d[0], args: d[2]}}},
    {"name": "expr_member", "symbols": [lex.string], "postprocess": id},
    {"name": "expr_member", "symbols": [{"literal":"%"}, "word"], "postprocess": function(d) {return {token: d[1]}}},
    {"name": "expr_member", "symbols": ["charclass"], "postprocess": id},
    {"name": "expr_member", "symbols": [{"literal":"("}, "whit?", "expression+", "whit?", {"literal":")"}], "postprocess": function(d) {return {'subexpression': d[2]} ;}},
    {"name": "expr_member", "symbols": ["expr_member", "whit?", "ebnf_modifier"], "postprocess": function(d) {return {'ebnf': d[0], 'modifier': d[2]}; }},
    {"name": "ebnf_modifier", "symbols": [lex.quantifier], "postprocess": id},
    {"name": "expr", "symbols": ["expr_member"]},
    {"name": "expr", "symbols": ["expr", "whit", "expr_member"], "postprocess": function(d){ return d[0].concat([d[2]]); }},
    {"name": "word", "symbols": [lex.word], "postprocess": id},
    {"name": "charclass", "symbols": [{"literal":"."}], "postprocess": function(d) { return new RegExp("."); }},
    {"name": "charclass", "symbols": [{"literal":"["}, "charclassmembers", {"literal":"]"}], "postprocess": function(d) { return new RegExp("[" + d[1].join('') + "]"); }},
    {"name": "charclassmembers", "symbols": []},
    {"name": "charclassmembers", "symbols": ["charclassmembers", "charclassmember"], "postprocess": function(d) { return d[0].concat([d[1]]); }},
    {"name": "charclassmember", "symbols": [/[^\\\]]/], "postprocess": function(d) { return d[0]; }},
    {"name": "charclassmember", "symbols": [{"literal":"\\"}, /./], "postprocess": function(d) { return d[0] + d[1]; }},
    {"name": "js", "symbols": [lex.js]},
    {"name": "whit", "symbols": ["whitraw"]},
    {"name": "whit", "symbols": ["whitraw?", lex.comment, "whit?"]},
    {"name": "whit?", "symbols": []},
    {"name": "whit?", "symbols": ["whit"]},
    {"name": "whitraw$ebnf$1", "symbols": ["s"]},
    {"name": "whitraw$ebnf$1", "symbols": ["whitraw$ebnf$1", "s"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "whitraw", "symbols": ["whitraw$ebnf$1"]},
    {"name": "whitraw$ebnf$2", "symbols": []},
    {"name": "whitraw$ebnf$2", "symbols": ["whitraw$ebnf$2", "s"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "whitraw$ebnf$3", "symbols": ["whit"], "postprocess": id},
    {"name": "whitraw$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "whitraw", "symbols": ["whitraw$ebnf$2", lex.comment, "whitraw$ebnf$3"]},
    {"name": "s", "symbols": [lex.NL]},
    {"name": "s", "symbols": [lex.WS]},
    {"name": "whitraw?", "symbols": []},
    {"name": "whitraw?", "symbols": ["whitraw"]},
    {"name": "whit?", "symbols": ["whit"]},
    {"name": "whit?", "symbols": []}
]
  , ParserStart: "final"
}

grammar.lex = lex;

if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
