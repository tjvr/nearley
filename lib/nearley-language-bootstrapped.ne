# nearley grammar
@{%

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
%}
@export lex

final -> whit? prog whit?  {% function(d) { return d[1]; } %}

prog -> prod  {% function(d) { return [d[0]]; } %}
      | prod whit prog  {% function(d) { return [d[0]].concat(d[2]); } %}

prod -> word whit? %lex.arrow whit? expression+  {% function(d) { return {name: d[0], rules: d[5]}; } %}
      | word "[" wordlist "]" whit? %lex.arrow whit? expression+ {% function(d) {return {macro: d[0], args: d[2], exprs: d[8]}} %}
      | "@" whit? js  {% function(d) { return {body: d[2]}; } %}
      | "@" word whit word  {% function(d) { return {config: d[1], value: d[3]}; } %}
      | "@include" whit? %lex.string {% function(d) {return {include: d[2].literal, builtin: false}} %}
      | "@builtin" whit? %lex.string {% function(d) {return {include: d[2].literal, builtin: true }} %}

expression+ -> completeexpression
             | expression+ whit? %lex.alt whit? completeexpression  {% function(d) { return d[0].concat([d[4]]); } %}

expressionlist -> completeexpression
             | expressionlist whit? "," whit? completeexpression {% function(d) { return d[0].concat([d[4]]); } %}

wordlist -> word
            | wordlist whit? "," whit? word {% function(d) { return d[0].concat([d[4]]); } %}

completeexpression -> expr  {% function(d) { return {tokens: d[0]}; } %}
                    | expr whit? js  {% function(d) { return {tokens: d[0], postprocess: d[2]}; } %}

expr_member ->
      word {% id %}
    | "$" word {% function(d) {return {mixin: d[1]}} %}
    | word "[" expressionlist "]" {% function(d) {return {macrocall: d[0], args: d[2]}} %} 
    | %lex.string {% id %}
    | "%" word {% function(d) {return {token: d[1]}} %}
    | charclass {% id %}
    | "(" whit? expression+ whit? ")" {% function(d) {return {'subexpression': d[2]} ;} %}
    | expr_member whit? ebnf_modifier {% function(d) {return {'ebnf': d[0], 'modifier': d[2]}; } %}

ebnf_modifier -> %lex.quantifier {% id %}

expr -> expr_member
      | expr whit expr_member  {% function(d){ return d[0].concat([d[2]]); } %}

word -> %lex.word {% id %}

charclass -> "."  {% function(d) { return new RegExp("."); } %}
           | "[" charclassmembers "]"  {% function(d) { return new RegExp("[" + d[1].join('') + "]"); } %}

charclassmembers -> null
                  | charclassmembers charclassmember  {% function(d) { return d[0].concat([d[1]]); } %}

charclassmember -> [^\\\]]  {% function(d) { return d[0]; } %}
                 | "\\" .  {% function(d) { return d[0] + d[1]; } %}

js -> %lex.js

# Whitespace with a comment
whit -> whitraw
      | whitraw? %lex.comment whit?

# Optional whitespace with a comment
whit? -> null
       | whit

# Literally a string of whitespace
whitraw -> s:+
         | s:* %lex.comment whit:?

s -> %lex.NL | %lex.WS

# A string of whitespace OR the empty string
whitraw? -> null
          | whitraw
whit? -> whit | null

