function InputStream(input) {
    var pos = 0, line = 1, col = 0;
    var POS = [];
    return {
        next  : next,
        move  : move,
        peek  : peek,
        eof   : eof,
        croak : croak,
    };
    function next() {
        var ch = peek();
        pos++;
        if (ch == "\n") line++, col = 0; else col++;
        return ch;
    }
    function move(dis) {
        pos += dis;
        return peek();
    }
    function peek() {
        if(!POS[pos])
            POS[pos] = {
                char: input.charAt(pos),
                line: line,
                col: col
            };
        line = POS[pos].line;
        col = POS[pos].col;
        return POS[pos].char;
    }
    function eof() {
        return peek() == "";
    }
    function croak(msg) {
        throw new Error(msg + " (" + line + ":" + col + ")");
    }
}

function TokenStream(input) {
    var current;
    var keywords = " if then else func ret true false while ";
    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : input.croak
    };
    function is_keyword(x) {
        return keywords.indexOf(" " + x + " ") >= 0;
    }
    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }
    function is_identifier_start(ch) {
        return /[a-z$_]/i.test(ch);
    }
    function is_identifier(ch) {
        return is_identifier_start(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
    }
    function is_operator_char(ch) {
        return "+-*/%=&|<>!".indexOf(ch) >= 0;
    }
    function is_punctuation(ch) {
        return ",;(){}[]".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
        return " \t\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
        var str = "";
        while (!input.eof() && predicate(input.peek()))
            str += input.next();
        return str;
    }
    function read_number() {
        var has_dot = false;
        var number = read_while(function(ch){
            if (ch == ".") {
                if (has_dot) return false;
                has_dot = true;
                return true;
            }
            return is_digit(ch);
        });
        return { type: "number", value: parseFloat(number) };
    }
    function read_identifier() {
        var id = read_while(is_identifier);
        return {
            type  : is_keyword(id) ? "keyword" : "variable",
            value : id
        };
    }
    function read_escaped(end) {
        var escaped = false, str = "";
        input.next();
        while (!input.eof()) {
            var ch = input.next();
            if (escaped) {
				if(ch == "n") str += "\n";
                else str += ch;
                escaped = false;
            } else if (ch == "\\") {
                escaped = true;
            } else if (end.indexOf(ch) >= 0) {
                break;
            } else {
                str += ch;
            }
        }
        return str;
    }
    function read_string(strType) {
        return { type: "string", value: read_escaped(strType) };
    }
    function read_next() {
        read_while(is_whitespace);
        if (input.eof()) return undefined;
        var ch = input.peek();
        if (ch == "#") {
            input.next();
            read_while(function(ch){ return ch != "\n" });
            input.next();
            return read_next();
        }
        if ("`\"'".indexOf(ch) >= 0) return read_string(ch);
        if (is_digit(ch)) return read_number();
        if (is_identifier_start(ch)) return read_identifier();
        if (is_punctuation(ch)) return {
            type  : "punctuation",
            value : input.next()
        };
        if (is_operator_char(ch)) return {
            type  : "operator",
            value : read_while(is_operator_char)
        };
        input.croak("Can't handle character: " + ch);
    }
    function peek() {
        return current || (current = read_next());
    }
    function next() {
        var tok = current;
        current = undefined;
        return tok || read_next();
    }
    function eof() {
        return peek() == undefined;
    }
}

function parse(input) {
    var PRECEDENCE = {
        "=": 1,
        "||": 2,
        "&&": 3,
        "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
        "+": 10, "-": 10,
        "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();
    function is_punctuation(ch) {
        var tok = input.peek();
        return tok && tok.type == "punctuation" && (!ch || tok.value == ch) && tok;
    }
    function is_keyword(kw) {
        var tok = input.peek();
        return tok && tok.type == "keyword" && (!kw || tok.value == kw) && tok;
    }
    function is_operator(op) {
        var tok = input.peek();
        return tok && tok.type == "operator" && (!op || tok.value == op) && tok;
    }
    function skip_punctuation(ch) {
        if (is_punctuation(ch)) input.next();
        else input.croak("Expecting punctuation: \"" + ch + "\"");
    }
    function skip_keyword(kw) {
        if (is_keyword(kw)) input.next();
        else input.croak("Expecting keyword: \"" + kw + "\"");
    }
    function skip_operator(op) {
        if (is_operator(op)) input.next();
        else input.croak("Expecting operator: \"" + op + "\"");
    }
    function unexpected() {
        input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }
    function maybe_binary(left, my_prec) {
        var tok = is_operator();
        if (tok) {
            var his_prec = PRECEDENCE[tok.value];
            if (his_prec > my_prec) {
                input.next();
                return maybe_binary({
                    type     : tok.value == "=" ? "assign" : "binary",
                    operator : tok.value,
                    left     : left,
                    right    : maybe_binary(parse_atom(), his_prec)
                }, my_prec);
            }
        }
        return left;
    }
    function delimited(start, stop, separator, parser) {
        var a = [], first = true;
        skip_punctuation(start);
        while (!input.eof()) {
            if (is_punctuation(stop)) break;
            if (first) first = false; else skip_punctuation(separator);
            if (is_punctuation(stop)) break;
            a.push(parser());
        }
        skip_punctuation(stop);
        return a;
    }
    function parse_call(func) {
        return {
            type: "call",
            func: func,
            args: delimited("(", ")", ",", parse_expression),
        };
    }
    function parse_varname() {
        var name = input.next();
        if (name.type != "variable") input.croak("Expecting variable name");
        return name.value;
    }
    function parse_if() {
        skip_keyword("if");
        var cond = parse_expression();
        if (!is_punctuation("{")) skip_keyword("then");
        var then = parse_expression();
        var ret = {
            type: "if",
            cond: cond,
            then: then,
        };
        if (is_keyword("else")) {
            input.next();
            ret.else = parse_expression();
        }
        return ret;
    }
    function parse_while() {
        skip_keyword("while");
        var cond = parse_expression();
        if (!is_punctuation("{")) skip_keyword("then");
        var then = parse_expression();
        var ret = {
            type: "while",
            cond: cond,
            then: then,
        };
        return ret;
    }
    function parse_return() {
        input.next();
        return {
            type: "return",
            body: parse_expression()
        }
    }
    function parse_function() {
        return {
            type: "function",
            name: input.peek().type == "variable" ? input.next().value : undefined,
            vars: delimited("(", ")", ",", parse_varname),
            body: parse_expression()
        };
    }
    function parse_boolean() {
        return {
            type  : "boolean",
            value : input.next().value != "false"
        };
    }
    function maybe_call(expr) {
        expr = expr();
        if(is_punctuation("(")) {
            return parse_call(expr);
        }else if(is_punctuation("[")) {
            input.next()
            pos = input.next().value;
            input.next();
            return {
                type: "getElement",
                arr: expr,
                pos: pos,
            };;
        }else {
            return expr;
        }
    }
    function parse_atom() {
        return maybe_call(function(){
            if (is_punctuation("(")) {
                input.next();
                var exp = parse_expression();
                skip_punctuation(")");
                return exp;
            }
            if (is_punctuation("[")) {
                var DEL = delimited("[", "]", ",", parse_expression);
                return {
                    type: "array",
                    len: DEL.length,
                    eles: DEL
                };
            }
            if (is_punctuation("{")) return parse_progress();
            if (is_keyword("if")) return parse_if();
            if (is_keyword("while")) return parse_while();
            if (is_keyword("true") || is_keyword("false")) return parse_boolean();
            if (is_keyword("ret")) return parse_return();
            if (is_keyword("func")) {
                input.next();
                return parse_function();
            }
            var tok = input.next();
            // console.log("here, token=", tok, "dof=", depthOfFunction);
            if (tok.type == "variable" || tok.type == "number" || tok.type == "string")
                return tok;
            unexpected();
        });
    }
    function parse_toplevel() {
        var prog = [];
        while (!input.eof()) {
            prog.push(parse_expression());
            if (!input.eof()) skip_punctuation(";");
        }
        return { type: "progress", prog: prog };
    }
    function parse_progress() {
        var prog = delimited("{", "}", ";", parse_expression);
        if (prog.length == 0) return { type: "undefined", value: undefined };
        if (prog.length == 1) return prog[0];
        return { type: "progress", prog: prog };
    }
    function parse_expression() {
        return maybe_call(function(){
            return maybe_binary(parse_atom(), 0);
        });
    }
}

function Environment(parent) {
    this.vars = Object.create(parent ? parent.vars : null);
    this.parent = parent;
}
Environment.prototype = {
    extend: function() {
        return new Environment(this);
    },
    lookup: function(name) {
        var scope = this;
        while (scope) {
            if (Object.prototype.hasOwnProperty.call(scope.vars, name))
                return scope;
            scope = scope.parent;
        }
    },
    get: function(name) {
        if (name in this.vars)
            return this.vars[name];
        throw new Error("Undefined variable " + name);
    },
    set: function(name, value) {
        var scope = this.lookup(name);
        if (!scope && this.parent)
            throw new Error("Undefined variable " + name);
        return (scope || this).vars[name] = value;
    },
    def: function(name, value) {
        return this.vars[name] = value;
    }
};

function evaluate(exp, env, callback) {
    GUARD(evaluate, arguments);
    switch (exp.type) {
      case "number":
      case "string":
      case "boolean":
        callback(exp.value);
        return;
      
      case "array":
        elements = [];
        (function loop(i) {
            if (i < exp.eles.length) 
            evaluate(exp.eles[i], env, function CC(val) {
                GUARD(CC, arguments);
                    elements[i] = val;
                    loop(i + 1);
                });
            else {
                callback(elements);
            }
        })(0);
        return;

      case "variable":
        callback(env.get(exp.value));
        return;

      case "assign":
        if (exp.left.type != "variable")
            throw new Error("Cannot assign to " + JSON.stringify(exp.left));
        evaluate(exp.right, env, function CC(right){
            GUARD(CC, arguments);
            callback(env.set(exp.left.value, right));
        });
        return;

      case "binary":
        evaluate(exp.left, env, function CC(left){
            GUARD(CC, arguments);
            evaluate(exp.right, env, function CC(right){
                GUARD(CC, arguments);
                callback(apply_operation(exp.operator, left, right));
            });
        });
        return;

      case "function":
        callback(make_function(env, exp));
        return;

      case "return":
            evaluate(exp.body, env, function CC(val) {
                GUARD(CC, arguments);
                // console.log("return case: ", val);
                callback({retCase: true, val: val});
            });
            return ;

      case "if":
        evaluate(exp.cond, env, function CC(cond){
            GUARD(CC, arguments);
            if (cond !== false) evaluate(exp.then, env, callback);
            else if (exp.else) evaluate(exp.else, env, callback);
            else callback(undefined);
        });
        return;
    
      case "while":
          evaluate(exp.cond, env, function CC(cond){
            GUARD(CC, arguments);
            // console.log("cond: ", cond, '\n');
            (function loop(Cond){
                GUARD(loop, arguments);
                // console.log("Cond: ", Cond, '\n');
                if (Cond) {
                    // console.log("exp.then: ", JSON.stringify(exp.then), '\n');
                    evaluate(exp.then, env, function CCC(){
                        GUARD(CCC, arguments);
                        evaluate(exp.cond, env, function CCCC(COnd){
                            GUARD(CCCC, arguments);
                            if(COnd) loop(COnd);
                            else callback(undefined);
                        });
                    });
                }
                else
                    callback(undefined);
            })(cond);
        });
        return;

      case "progress":
        (function loop(last, i){
            GUARD(loop, arguments);
            if (i < exp.prog.length) 
                evaluate(exp.prog[i], env, function CC(val) {
                    GUARD(CC, arguments);
                    // console.log("val =", val);
                    if(val && val.retCase) {
                        callback(val.val);
                    }else {
                        loop(val, i + 1);
                    }
                });
            else
                callback(last);
        })(undefined, 0);
        return;

      case "call":
        evaluate(exp.func, env, function CC(func){
            GUARD(CC, arguments);
            (function loop(args, i){
                GUARD(loop, arguments);
                if (i < exp.args.length) 
                    evaluate(exp.args[i], env, function CC(arg) {
                        GUARD(CC, arguments);
                        args[i + 1] = arg;
                        loop(args, i + 1);
                    });
                else {
                    func.apply(null, args);
                    // console.log("ret =", ret);
                    // if(ret && ret.retCase) {
                    //     return ret.val
                    // }
                    // return ret;
                }
            })([ callback ], 0);
        });
        return;

        case "getElement":
            evaluate(exp.arr, env, function CC(arr) {
                GUARD(CC, arguments);
                callback(arr[exp.pos]);
            });
            return;

      default:
        throw new Error("I don't know how to evaluate " + exp.type);
    }
}

function make_function(env, exp) {
    if (exp.name) {
        env = env.extend();
        env.def(exp.name, func);
    }
    function func(callback) {
        GUARD(func, arguments);
        var names = exp.vars;
        var scope = env.extend();
        for (var i = 0; i < names.length; ++i)
            scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);
        evaluate(exp.body, scope, function(val) {
            if(val && val.retCase) {
                callback(val.val);
            }else {
                callback(val);
            }
        });
    }
    return func;
}

function apply_operation(op, a, b) {
    function num(x) {
        if (typeof x != "number")
            throw new Error("Expected number but got " + x);
        return x;
    }

    add = function(a,b){
        var c, d, e;
        try {
            c = a.toString().split(".")[1].length;
        } catch (f) {
            c = 0;
        }
        try {
            d = b.toString().split(".")[1].length;
        } catch (f) {
            d = 0;
        }
        return e = Math.pow(10, Math.max(c, d)), (this.mul(a, e) + this.mul(b, e)) / e;
    }
    mul = function(a, b) {
        var c = 0,
            d = a.toString(),
            e = b.toString();
        try {
            c += d.split(".")[1].length;
        } catch (f) {}
        try {
            c += e.split(".")[1].length;
        } catch (f) {}
        return Number(d.replace(".", "")) * Number(e.replace(".", "")) / Math.pow(10, c);
    }
    sub = function(a,b){
        var c, d, e;
        try {
            c = a.toString().split(".")[1].length;
        } catch (f) {
            c = 0;
        }
        try {
            d = b.toString().split(".")[1].length;
        } catch (f) {
            d = 0;
        }
        return e = Math.pow(10, Math.max(c, d)), (this.mul(a, e) - this.mul(b, e)) / e;
    }
    div = function(a, b) {
        if(b == 0)
            throw new Error("Divide by zero");
        var c, d, e = 0,
            f = 0;
        try {
            e = a.toString().split(".")[1].length;
        } catch (g) {}
        try {
            f = b.toString().split(".")[1].length;
        } catch (g) {}
        return c = Number(a.toString().replace(".", "")), d = Number(b.toString().replace(".", "")), this.mul(c / d, Math.pow(10, f - e));
    }
    NP.mod = function(a, b) {
        if(b == 0)
            throw new Error("Divide by zero");
        return a%b;
    }
  
    switch (op) {
      case "+": 
        if(typeof a == "string") {
            return a + b;
        }else return NP.plus(num(a), num(b));
      case "-": return NP.minus(num(a), num(b));
      case "*": return NP.times(num(a), num(b));
      case "/": return NP.divide(num(a), num(b));
      case "%": return mod(num(a), num(b));
      case "&&": return a !== false && b;
      case "||": return a !== false ? a : b;
      case "<": return num(a) < num(b);
      case ">": 
        // console.log("numa, numb ", num(a), ", ", num(b), "\n");
        return num(a) > num(b);
      case "<=": return num(a) <= num(b);
      case ">=": return num(a) >= num(b);
      case "==": return a === b;
      case "!=": return a !== b;
    }
    throw new Error("Can't apply operator " + op);
}

/* -----[ entry point for NodeJS ]----- */

var STACKLEN;
function GUARD(f, args) {
    if (--STACKLEN < 0) throw new Continuation(f, args);
}
function Continuation(f, args) {
    this.f = f;
    this.args = args;
}
function Execute(f, args) {
    while (true) try {
        STACKLEN = 50;
        return f.apply(null, args);
    } catch(ex) {
        if (ex instanceof Continuation)
            f = ex.f, args = ex.args;
        else throw ex;
    }
}

var globalEnv = new Environment();
var rl;
if (typeof process != "undefined") rl = require('readline-sync');
function textOut(text) {
    if (typeof process != "undefined") {
        process.stdout.write(str, 'utf8');
    }else {
        console.log(text);
    }
}


globalEnv.def("time", function(k, func){
    var t0, t1;
    if(typeof performance != "undefined") {
        t0 = performance.now();
    }else {
        console.time("time");
    }
    func(function(ret){
        if(typeof performance != "undefined") {
            t1 = performance.now();
            textOut((t1-t0).toFixed(4) + " ms\n");
        }else {
            console.timeEnd("time");
        }
        k(ret);
    });
});
globalEnv.def("out", function(k, ...args) {
	str = "";
    args.map(e => {
		if(typeof e != "string") {
			if(typeof e == "object") {
				return JSON.stringify(e);
			}else if(e == undefined) {
				return "undefined";
			}
			return e.toString();
		}
		return e;
	});
    str = args.join("");
    textOut(str);
    k(undefined);
});

globalEnv.def("in", function(k, Ques, format) {
    try {
        a = prompt(Ques);
    } catch (error) {
        process.stdout.write(Ques, 'utf8');
        a = rl.question(" ", { encoding: 'utf8' });
    }
    switch(format) {
        case "number" :
            a = parseFloat(a);
            k(a);
            break;
        case "boolean": 
            a = (a) ? true: false;
            k(a);
            break;
        default: 
            k(a);
    }
});

globalEnv.def("toNumber", function(k, x) {
    k(parseFloat(x));
});

globalEnv.def("toString", function(k, x) {
    k(String(x));
});

globalEnv.def("fibJS", function(k, n){
    ret = (function fibJS(N) {
        if (N <= 2) return (1);
        return (fibJS(N - 1) + fibJS(N - 2));
    })(n);
    k(ret);
});

/*var code = `fib = func(n) {
    if (n <= 2) {
        ret 1;
    } else {
        ret (fib(n - 1) + fib(n - 2));
    }
};
k = in("費「事」數列第幾項?", "number");
out("fib(", k, ")\n");
time(func() { 
    out(fib(k), "\n"); 
});
arr = [1, 2, 3];
out(arr[1], "\n")`;
// var code = `add1 = func(n) {
//     ret n+1;
// };
// out("output:",add1(3), "\n");
// `;
var ast = parse(TokenStream(InputStream(code)));
Execute(evaluate, [ ast, globalEnv, function(result){
    console.log("*** Result:", result);
}]);*/