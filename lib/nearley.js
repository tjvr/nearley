(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

var hasOwnProperty = Object.prototype.hasOwnProperty;

function Rule(name, symbols, postprocess) {
    this.name = name;
    this.symbols = symbols;        // a list of literal | regex class | nonterminal
    this.postprocess = postprocess;

    // cache a Tag for each dot position
    var tags = [];
    for (var i = 0; i < symbols.length; i++) {
      tags.push(new LR0(this, i));
    }
    tags.push(Tag.get(name))
    for (var i = 0; i < symbols.length; i++) {
      tags[i].next = tags[i + 1];
    }
    this.first = tags[0];

    return this;
}

Rule.prototype.toString = function(withCursorAt) {
    function stringifySymbolSequence (e) {
        return e.literal ? JSON.stringify(e.literal) :
               e.type ? '%' + e.type : e.toString();
    }
    var symbolSequence = (typeof withCursorAt === "undefined")
                         ? this.symbols.map(stringifySymbolSequence).join(' ')
                         : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                             + " ● "
                             + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
    return this.name + " → " + symbolSequence;
}


function Tag(name) {
    this.id = ++Tag.highestId;

    this.name = name;
    this.expect = null;
    this.next = null;
}
Tag.highestId = 0;
Tag._names = {};

Tag.get = function(name) {
    if (hasOwnProperty.call(Tag._names, name)) {
        return Tag._names[name];
    } else {
        return Tag._names[name] = new Tag(null, null, name);
    }
}

Tag.prototype.toString = function() {
    return this.name;
}


function LR0(rule, dot) {
    this.id = ++Tag.highestId;

    // a dotted rule (i.e. LR0)
    this.name = null; // not a non-terminal
    this.expect = rule.symbols[dot];
    this.next = null;
    this.rule = rule;
    this.dot = dot;
}

LR0.prototype.toString = function() {
  return this.rule.toString(this.dot);
}


// a State is a rule at a position from a given starting point in the input stream (reference)
function State(tag, reference, wantedBy) {
    this.tag = tag;
    this.reference = reference;
    this.data = [];
    this.wantedBy = wantedBy;
}

State.prototype.toString = function() {
    return "{" + this.tag.toString() + "}, from: " + (this.reference || 0);
};

State.prototype.addDerivation = function(left, right, rule) {
    if (this.left) throw new Error('whoa')
    this.left = left;
    this.right = right;
    this.rule = rule;
    if (this.tag.name !== null) { // complete
        this.data = this.build();
    }
}

State.prototype.build = function() {
    var children = [];
    var node = this;
    do {
        children.push(node.right.data);
        node = node.left;
    } while (node.left);
    children.reverse();
    return children;
};

State.prototype.finish = function() {
    var rule = this.rule;
    if (rule && rule.postprocess) {
        this.data = rule.postprocess.call(this, this.data);
    }
};


function Column(grammar, index) {
    this.grammar = grammar;
    this.index = index;

    this.states = [];
    this.unique = {};

    this.wants = {}; // states indexed by the non-terminal they expect
    this.scannable = []; // list of states that expect a token
    this.completed = {}; // states that are nullable
}

Column.prototype.add = function(tag, reference, wantedBy) {
    // nb. We assume Grammar cannot change during Column::process().
    var key = (reference << 16) | tag.id;
    var s = this.unique[key];
    if (!s) {
        s = this.unique[key] = new State(tag, reference, wantedBy);
        this.states.push(s);
    }
    return s;
}

Column.prototype.process = function(nextColumn) {
    var states = this.states;
    var wants = this.wants;
    var completed = this.completed;

    for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
        var state = states[w];

        if (state.tag.name !== null) { // complete
            state.finish();
            // complete
            var wantedBy = state.wantedBy;
            for (var i = wantedBy.length; i--; ) { // this line is hot
                var left = wantedBy[i];
                this.complete(left, state);
            }

            // special-case nullables
            if (state.reference === this.index) {
                // make sure future predictors of this rule get completed.
                var exp = state.tag.name;
                (this.completed[exp] = this.completed[exp] || []).push(state);
            }

        } else {
            // queue scannable states
            var exp = state.tag.expect;
            if (exp && typeof exp !== 'string') {
                this.scannable.push(state);
                continue;
            }

            // predict
            if (wants[exp]) {
                wants[exp].push(state);

                if (hasOwnProperty.call(completed, exp)) {
                    var nulls = completed[exp];
                    for (var i = 0; i < nulls.length; i++) {
                        var right = nulls[i];
                        this.complete(state, right);
                    }
                }
            } else {
                wants[exp] = [state];
                this.predict(exp);
            }
        }
    }
}

Column.prototype.predict = function(exp) {
    var rules = this.grammar.byName[exp] || [];

    for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var wantedBy = this.wants[exp];
        this.add(rule.first, this.index, wantedBy);
    }
}

Column.prototype.complete = function(left, right) {
    var copy = this.add(left.tag.next, left.reference, left.wantedBy);
    copy.addDerivation(left, right, left.tag.rule);
}


function Grammar(rules, start) {
    this.rules = rules;
    this.start = start || this.rules[0].name;
    var byName = this.byName = {};
    this.rules.forEach(function(rule) {
        if (!hasOwnProperty.call(byName, rule.name)) {
            byName[rule.name] = [];
        }
        byName[rule.name].push(rule);
    });
}

Grammar.fromCompiled = function(exports) {
    if (arguments.length > 1) throw new Error('wrong number of arguments')
    var lexer = exports.Lexer;
    var start = exports.ParserStart;
    var rules = exports.ParserRules;
    var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
    var g = new Grammar(rules, start);
    g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
    return g;
}

Grammar.prototype.parser = function(options) {
    return new Parser(this, options);
}


function StreamLexer() {
  this.reset("");
}

StreamLexer.prototype.reset = function(data, state) {
    this.buffer = data;
    this.index = 0;
    this.line = state ? state.line : 1;
    this.lastLineBreak = state ? -state.col : 0;
}

StreamLexer.prototype.next = function() {
    if (this.index < this.buffer.length) {
        var ch = this.buffer[this.index++];
        if (ch === '\n') {
          this.line += 1;
          this.lastLineBreak = this.index;
        }
        return {text: ch};
    }
}

StreamLexer.prototype.save = function() {
  return {
    line: this.line,
    col: this.index - this.lastLineBreak,
  }
}

StreamLexer.prototype.formatError = function(token, message) {
    // nb. this gets called after consuming the offending token,
    // so the culprit is index-1
    var buffer = this.buffer;
    if (typeof buffer === 'string') {
        var nextLineBreak = buffer.indexOf('\n', this.index);
        if (nextLineBreak === -1) nextLineBreak = buffer.length;
        var line = buffer.substring(this.lastLineBreak, nextLineBreak)
        var col = this.index - this.lastLineBreak;
        message += " at line " + this.line + " col " + col + ":\n\n";
        message += "  " + line + "\n"
        message += "  " + Array(col).join(" ") + "^"
        return message;
    } else {
        return message + " at index " + (this.index - 1);
    }
}


function Parser(grammar, options) {
    if (!(grammar instanceof Grammar)) { throw new Error('not a grammar: ' + grammar) }
    this.grammar = grammar;

    // Read options
    this.options = {
        keepHistory: false,
        lexer: grammar.lexer || new StreamLexer,
    };
    for (var key in (options || {})) {
        this.options[key] = options[key];
    }

    // Setup lexer
    this.lexer = this.options.lexer;
    this.lexerState = undefined;

    // Setup a table
    var column = new Column(grammar, 0);
    var table = this.table = [column];

    // I could be expecting anything.
    column.wants[grammar.start] = [];
    column.predict(grammar.start);
    // TODO what if start rule is nullable?
    column.process();
    this.current = 0; // token index
}

Parser.prototype.feed = function(chunk) {
    var lexer = this.lexer;
    lexer.reset(chunk, this.lexerState);

    var token;
    while (token = lexer.next()) {
        // We add new states to table[current+1]
        var column = this.table[this.current];

        // GC unused states
        if (!this.options.keepHistory) {
            delete this.table[this.current - 1];
        }

        var n = this.current + 1;
        var nextColumn = new Column(this.grammar, n);
        this.table.push(nextColumn);

        // Advance all tokens that expect the symbol
        var literal = token.text;
        var tokenOrCh = lexer.constructor === StreamLexer ? token.text : token;
        var scannable = column.scannable;
        for (var w = scannable.length; w--; ) {
            var state = scannable[w];
            var expect = state.tag.expect;
            // Try to consume the token
            // either regex or literal
            if (expect.test ? expect.test(tokenOrCh) :
                expect.type ? expect.type === token.type
                            : expect.literal === literal) {
                // Add it
                nextColumn.complete(state, {data: tokenOrCh, token: token, isToken: true, reference: n - 1})
            }
        }

        // Next, for each of the rules, we either
        // (a) complete it, and try to see if the reference row expected that
        //     rule
        // (b) predict the next nonterminal it expects by adding that
        //     nonterminal's start state
        // To prevent duplication, we also keep track of rules we have already
        // added

        nextColumn.process();

        // If needed, throw an error:
        if (nextColumn.states.length === 0) {
            // No states at all! This is not good.
            var message = this.lexer.formatError(token, "invalid syntax") + "\n";
            message += "Unexpected " + (token.type ? token.type + " token: " : "");
            message += JSON.stringify(token.text !== undefined ? token.text : token) + "\n";
            var err = new Error(message);
            err.offset = this.current;
            err.token = token;
            throw err;
        }

        // maybe save lexer state
        if (this.options.keepHistory) {
          column.lexerState = lexer.save()
        }

        this.current++;
    }
    if (column) {
      this.lexerState = lexer.save()
    }

    // Incrementally keep track of results
    this.results = this.finish();

    // Allow chaining, for whatever it's worth
    return this;
};

Parser.prototype.save = function() {
    var column = this.table[this.current];
    column.lexerState = this.lexerState;
    return column;
};

Parser.prototype.restore = function(column) {
    var index = column.index;
    this.current = index;
    this.table[index] = column;
    this.table.splice(index + 1);
    this.lexerState = column.lexerState;

    // Incrementally keep track of results
    this.results = this.finish();
};

// nb. deprecated: use save/restore instead!
Parser.prototype.rewind = function(index) {
    if (!this.options.keepHistory) {
        throw new Error('set option `keepHistory` to enable rewinding')
    }
    // nb. recall column (table) indicies fall between token indicies.
    //        col 0   --   token 0   --   col 1
    this.restore(this.table[index]);
};

Parser.prototype.finish = function() {
    // Return the possible parsings
    var considerations = [];
    var start = this.grammar.start;
    var column = this.table[this.table.length - 1]
    column.states.forEach(function (t) {
        if (t.tag.name === start && t.reference === 0) {
            considerations.push(t);
        }
    });
    return considerations.map(function(c) {return c.data; });
};

return {
    Parser: Parser,
    Grammar: Grammar,
    Rule: Rule,
};

}));
